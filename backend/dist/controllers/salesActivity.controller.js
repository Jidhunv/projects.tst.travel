"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesActivityController = void 0;
const salesActivityService = __importStar(require("../services/salesActivity.service"));
// Sales activity KPIs. Access and the salesperson filter are checked in the service.
class SalesActivityController {
    async getSummary(req, res, next) {
        try {
            const { from, to, country, region, salespersonId } = req.query;
            const data = await salesActivityService.summary(req.user, {
                from: from,
                to: to,
                country: country,
                region: region,
                salespersonId: salespersonId,
            });
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async getOptions(req, res, next) {
        try {
            // The Reports page asks for the report module's visibility; the KPI and visit screens use sales visits.
            const module = req.query.module === 'reports' ? 'reports' : 'sales_visits';
            const data = await salesActivityService.options(req.user, module);
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SalesActivityController = SalesActivityController;
exports.default = new SalesActivityController();
//# sourceMappingURL=salesActivity.controller.js.map