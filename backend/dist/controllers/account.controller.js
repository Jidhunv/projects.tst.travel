"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountController = void 0;
const account_service_1 = __importDefault(require("../services/account.service"));
const team_service_1 = __importDefault(require("../services/team.service"));
const auth_1 = require("../middleware/auth");
const user_service_1 = __importDefault(require("../services/user.service"));
const errorHandler_1 = require("../middleware/errorHandler");
const inputValidator_1 = __importDefault(require("../utils/inputValidator"));
const pick_1 = __importDefault(require("../utils/pick"));
const logger_1 = __importDefault(require("../utils/logger"));
// Access check for a single account that understands "team" (group) scope: a
// team-scoped user may act on accounts owned by a group co-member, plus their
// own. Returns silently if allowed, throws 403 otherwise. "all" allows anything.
async function assertAccountScope(req, account, action) {
    const scope = (0, auth_1.getScope)(req.user, 'accounts', action);
    if (scope === 'all')
        return;
    const uid = req.user.id;
    const isOwnerOrAssignee = account.ownerId === uid || (Array.isArray(account.assigneeIds) && account.assigneeIds.includes(uid));
    if (scope === 'team') {
        // Assigned directly to the caller?
        if (Array.isArray(account.assigneeIds) && account.assigneeIds.includes(uid))
            return;
        const [supTeams, memTeams, acctTeams] = await Promise.all([
            team_service_1.default.getSupervisedTeamIds(uid),
            team_service_1.default.getUserTeamIds(uid),
            account_service_1.default.getAccountTeamIds(account.id),
        ]);
        // Supervisor of a team the account is linked to?
        if (acctTeams.some((t) => supTeams.includes(t)))
            return;
        // Creator, and the account is untethered or linked to a team they're still in?
        if (account.ownerId === uid && (acctTeams.length === 0 || acctTeams.some((t) => memTeams.includes(t))))
            return;
        throw new errorHandler_1.AppError(403, 'You do not have access to this account');
    }
    if (scope === 'self') {
        if (isOwnerOrAssignee)
            return;
        throw new errorHandler_1.AppError(403, 'You can only access your own accounts');
    }
    throw new errorHandler_1.AppError(403, 'You do not have permission to access this account');
}
class AccountController {
    async createAccount(req, res, next) {
        try {
            // Enforce RBAC: the account:create toggle must actually gate creation,
            // otherwise any authenticated user can create accounts regardless of role.
            if (!(0, auth_1.canPerformAction)(req.user, 'accounts', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create accounts');
            }
            const { name, industry, size, website, phoneNumber, alternatePhoneNumber, email, remark, type, contactPerson, city, region, country } = req.body;
            // Validate required fields
            const nameValidation = inputValidator_1.default.validateString(name, 'Account name', 1, 100);
            if (!nameValidation.valid) {
                throw new errorHandler_1.AppError(400, nameValidation.errors.join(', '));
            }
            // Validate optional fields
            if (website) {
                const urlValidation = inputValidator_1.default.validateUrl(website);
                if (!urlValidation.valid) {
                    throw new errorHandler_1.AppError(400, urlValidation.errors.join(', '));
                }
            }
            if (phoneNumber) {
                const phoneValidation = inputValidator_1.default.validatePhone(phoneNumber);
                if (!phoneValidation.valid) {
                    throw new errorHandler_1.AppError(400, phoneValidation.errors.join(', '));
                }
            }
            if (email) {
                const emailValidation = inputValidator_1.default.validateEmail(email);
                if (!emailValidation.valid) {
                    throw new errorHandler_1.AppError(400, emailValidation.errors.join(', '));
                }
            }
            const account = await account_service_1.default.createAccount({
                name,
                industry,
                size,
                website,
                phoneNumber,
                alternatePhoneNumber,
                // The column is unique, so omit an empty address entirely (stored as
                // NULL) rather than saving "" -- a second blank would collide.
                email: email || undefined,
                remark,
                type,
                contactPerson,
                city,
                region,
                country,
                ownerId: req.user.id,
                createdBy: req.user.id,
            });
            // Auto-link the new account to every team the creator is a member of, so
            // those teams' supervisors can see it. A creator in no team => untethered
            // (private to the creator). Applies to every create path (this controller).
            const creatorTeamIds = await team_service_1.default.getUserTeamIds(req.user.id);
            if (creatorTeamIds.length)
                await account_service_1.default.setAccountTeams(account.id, creatorTeamIds);
            logger_1.default.info(`Account created: ${account.name} by ${req.user.email}`);
            return res.status(201).json({
                success: true,
                data: account,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAccounts(req, res, next) {
        try {
            const { page = 1, limit = 20, status, type, ownerId, search, city, region, country, fromDate, toDate } = req.query;
            // Visibility by read scope:
            //   all  -> everything (optionally filtered by an ownerId query param)
            //   team -> own + owned by a co-member + assigned to my team + assigned to me
            //   self -> only their own accounts
            const scope = (0, auth_1.getReadScope)(req.user, 'accounts');
            let effectiveOwnerId;
            let teamScope = false;
            let selfId;
            let supAccts;
            let memAccts;
            if (scope === 'all') {
                // Admin can filter by specific owner or view all
                effectiveOwnerId = ownerId && ownerId !== '' ? ownerId : undefined;
            }
            else if (scope === 'team') {
                const uid = req.user.id;
                // Visibility follows the account -> team link:
                //  - supervisor sees every account linked to a team they supervise
                //  - creator sees own accounts that are untethered or linked to a team
                //    they are still a member of
                //  - plus any account assigned directly to them (assigneeIds)
                const [supTeams, memTeams] = await Promise.all([
                    team_service_1.default.getSupervisedTeamIds(uid),
                    team_service_1.default.getUserTeamIds(uid),
                ]);
                const [supervisedAccountIds, memberAccountIds] = await Promise.all([
                    account_service_1.default.getAccountIdsForTeams(supTeams),
                    account_service_1.default.getAccountIdsForTeams(memTeams),
                ]);
                teamScope = true;
                selfId = uid;
                supAccts = supervisedAccountIds;
                memAccts = memberAccountIds;
            }
            else {
                effectiveOwnerId = req.user.id;
            }
            const { data, total } = await account_service_1.default.getAccounts({
                page: Number(page),
                limit: Number(limit),
                status: status,
                type: type,
                ownerId: effectiveOwnerId,
                teamScope,
                selfId,
                supervisedAccountIds: supAccts,
                memberAccountIds: memAccts,
                search: search,
                city: city,
                region: region,
                country: country,
                fromDate: fromDate,
                toDate: toDate,
            });
            return res.json({
                success: true,
                data,
                meta: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAccount(req, res, next) {
        try {
            const { id } = req.params;
            const account = await account_service_1.default.getAccountById(id);
            await assertAccountScope(req, account, 'read');
            const assignedTeamIds = await account_service_1.default.getAccountTeamIds(id);
            return res.json({
                success: true,
                data: { ...account, assignedTeamIds },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateAccount(req, res, next) {
        try {
            const { id } = req.params;
            // Authorization: must have update permission AND be allowed to touch this record.
            if (!(0, auth_1.canPerformAction)(req.user, 'accounts', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update accounts');
            }
            const existing = await account_service_1.default.getAccountById(id);
            await assertAccountScope(req, existing, 'update');
            // Whitelist updatable fields to prevent mass assignment (e.g. reassigning ownerId).
            // Anything missing here is silently dropped, so a field the edit form sends
            // will appear to save and then not persist -- which is exactly what happened
            // to email and remark. Keep this in step with the Account model.
            const allowed = [
                'name', 'industry', 'size', 'website', 'phoneNumber', 'alternatePhoneNumber', 'email', 'remark', 'type', 'status', 'tier',
                'contactPerson', 'city', 'region', 'country',
                'billingStreet', 'billingCity', 'billingState', 'billingZip', 'billingCountry',
                'shippingStreet', 'shippingCity', 'shippingState', 'shippingZip', 'shippingCountry',
                'onboardingStatus', 'onboardingDate', 'onboardingCompletedDate', 'onboardingNotes',
                'contractSignedDate', 'goLiveDate', 'accountManager', 'billingContact', 'technicalContact', 'tags',
            ];
            const updates = (0, pick_1.default)(req.body, allowed);
            // Validate the same fields create does. An empty string clears the value.
            if (updates.email) {
                const emailCheck = inputValidator_1.default.validateEmail(updates.email);
                if (!emailCheck.valid) {
                    throw new errorHandler_1.AppError(400, emailCheck.errors.join(', '));
                }
            }
            if (updates.website) {
                const urlCheck = inputValidator_1.default.validateUrl(updates.website);
                if (!urlCheck.valid) {
                    throw new errorHandler_1.AppError(400, urlCheck.errors.join(', '));
                }
            }
            if (updates.phoneNumber) {
                const phoneCheck = inputValidator_1.default.validatePhone(updates.phoneNumber);
                if (!phoneCheck.valid) {
                    throw new errorHandler_1.AppError(400, phoneCheck.errors.join(', '));
                }
            }
            // The column is unique, so normalise "" to null rather than letting a
            // second blank collide with the first.
            if (updates.email === '')
                updates.email = null;
            // Assignment: an account may be assigned to teams (all their members see
            // it) and/or specific users (assigneeIds). Anyone who can update the
            // account may set these.
            if (Array.isArray(req.body.assigneeIds))
                updates.assigneeIds = req.body.assigneeIds;
            const account = await account_service_1.default.updateAccount(id, updates);
            if (Array.isArray(req.body.assignedTeamIds)) {
                await account_service_1.default.setAccountTeams(id, req.body.assignedTeamIds);
            }
            const assignedTeamIds = await account_service_1.default.getAccountTeamIds(id);
            logger_1.default.info(`Account updated: ${account.id} by ${req.user.email}`);
            return res.json({
                success: true,
                data: { ...account, assignedTeamIds },
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Assign an account to one or more users (Admin/Manager only).
    async assignAccount(req, res, next) {
        try {
            if (!(0, auth_1.canReassign)(req.user, 'accounts')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to reassign accounts');
            }
            const ids = Array.isArray(req.body.ownerIds)
                ? req.body.ownerIds
                : req.body.ownerId ? [req.body.ownerId] : [];
            if (!ids.length)
                throw new errorHandler_1.AppError(400, 'ownerIds is required');
            for (const id of ids)
                await user_service_1.default.getUserById(id);
            const account = await account_service_1.default.updateAccount(req.params.id, { ownerId: ids[0], assigneeIds: ids });
            logger_1.default.info(`Account ${account.id} assigned to [${ids.join(', ')}] by ${req.user.email}`);
            return res.json({ success: true, data: account });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteAccount(req, res, next) {
        try {
            const { id } = req.params;
            if (!(0, auth_1.canPerformAction)(req.user, 'accounts', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete accounts');
            }
            const existing = await account_service_1.default.getAccountById(id);
            await assertAccountScope(req, existing, 'delete');
            await account_service_1.default.deleteAccount(id);
            logger_1.default.info(`Account deleted: ${id} by ${req.user.email}`);
            return res.json({
                success: true,
                data: { message: 'Account deleted successfully' },
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Contacts belong to an account and inherit its ownership. Every contact
    // operation must therefore verify the caller may act on the parent account,
    // otherwise a user can read or mutate contacts on accounts they do not own
    // simply by passing another account's id (IDOR).
    async assertCanAccessAccount(req, accountId, action) {
        const account = await account_service_1.default.getAccountById(accountId);
        if (!(0, auth_1.canAccessRecord)(req.user, 'accounts', account.ownerId, action, account.assigneeIds)) {
            throw new errorHandler_1.AppError(403, 'You can only manage contacts for your own accounts');
        }
        return account;
    }
    // Contact management
    async addContact(req, res, next) {
        try {
            const { accountId } = req.params;
            await this.assertCanAccessAccount(req, accountId, 'update');
            const { firstName, lastName, email, phoneNumber, jobTitle, role } = req.body;
            if (!firstName || !lastName || !email) {
                throw new errorHandler_1.AppError(400, 'First name, last name, and email are required');
            }
            const contact = await account_service_1.default.addContact(accountId, {
                firstName,
                lastName,
                email,
                phoneNumber,
                jobTitle,
                role,
            });
            logger_1.default.info(`Contact added to account ${accountId}: ${contact.email}`);
            return res.status(201).json({
                success: true,
                data: contact,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getContacts(req, res, next) {
        try {
            const { accountId } = req.params;
            await this.assertCanAccessAccount(req, accountId, 'read');
            const contacts = await account_service_1.default.getAccountContacts(accountId);
            return res.json({
                success: true,
                data: contacts,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateContact(req, res, next) {
        try {
            const { accountId, contactId } = req.params;
            await this.assertCanAccessAccount(req, accountId, 'update');
            // Whitelist updatable fields to prevent mass assignment (e.g. a client
            // setting isPrimary, accountId, or system columns via the raw body).
            const updates = (0, pick_1.default)(req.body, ['firstName', 'lastName', 'email', 'phoneNumber', 'jobTitle', 'role']);
            const contact = await account_service_1.default.updateContact(accountId, contactId, updates);
            logger_1.default.info(`Contact updated: ${contactId} by ${req.user.email}`);
            return res.json({
                success: true,
                data: contact,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteContact(req, res, next) {
        try {
            const { accountId, contactId } = req.params;
            // Removing a contact modifies the parent account's contact list, so it
            // requires 'update' on the account -- not account-level 'delete'.
            await this.assertCanAccessAccount(req, accountId, 'update');
            await account_service_1.default.deleteContact(accountId, contactId);
            logger_1.default.info(`Contact deleted: ${contactId} from account ${accountId}`);
            return res.json({
                success: true,
                data: { message: 'Contact deleted successfully' },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async setPrimaryContact(req, res, next) {
        try {
            const { accountId, contactId } = req.params;
            await this.assertCanAccessAccount(req, accountId, 'update');
            const contact = await account_service_1.default.setPrimaryContact(accountId, contactId);
            logger_1.default.info(`Primary contact set for account ${accountId}: ${contactId}`);
            return res.json({
                success: true,
                data: contact,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Buying-committee onboarding ---
    async getStakeholders(req, res, next) {
        try {
            const { accountId } = req.params;
            await this.assertCanAccessAccount(req, accountId, 'read');
            const stakeholders = await account_service_1.default.getStakeholders(accountId);
            return res.json({ success: true, data: stakeholders });
        }
        catch (error) {
            next(error);
        }
    }
    async saveStakeholders(req, res, next) {
        try {
            const { accountId } = req.params;
            await this.assertCanAccessAccount(req, accountId, 'update');
            const { stakeholders } = req.body;
            if (!Array.isArray(stakeholders)) {
                throw new errorHandler_1.AppError(400, 'stakeholders must be an array of { role, name, designationId }');
            }
            const saved = await account_service_1.default.upsertStakeholders(accountId, stakeholders);
            logger_1.default.info(`Stakeholders saved for account ${accountId} by ${req.user.email}`);
            return res.json({ success: true, data: saved });
        }
        catch (error) {
            next(error);
        }
    }
    async getOnboardingStatus(req, res, next) {
        try {
            const { accountId } = req.params;
            await this.assertCanAccessAccount(req, accountId, 'read');
            const status = await account_service_1.default.getOnboardingStatus(accountId);
            return res.json({ success: true, data: status });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AccountController = AccountController;
exports.default = new AccountController();
//# sourceMappingURL=account.controller.js.map