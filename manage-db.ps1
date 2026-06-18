# CRM System - Database Management Script

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("create", "drop", "reset", "seed", "backup", "restore", "status")]
    [string]$Action,

    [string]$BackupFile = "crm_db_backup.sql"
)

$postgresUser = "postgres"
$postgresHost = "localhost"
$dbName = "crm_db"

Write-Host "CRM Database Management" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Get PostgreSQL password
Write-Host "Enter PostgreSQL password:" -ForegroundColor Yellow
$postgresPassword = Read-Host -AsSecureString
$postgresPlainPassword = [System.Net.NetworkCredential]::new("", $postgresPassword).Password
$env:PGPASSWORD = $postgresPlainPassword

function Check-PostgreSQL {
    try {
        psql -U $postgresUser -h $postgresHost -c "SELECT 1" 2>$null | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Check PostgreSQL connection
if (-not (Check-PostgreSQL)) {
    Write-Host "✗ Cannot connect to PostgreSQL" -ForegroundColor Red
    Write-Host "  Make sure PostgreSQL is running on $postgresHost`:5432" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Connected to PostgreSQL" -ForegroundColor Green
Write-Host ""

switch ($Action) {
    "create" {
        Write-Host "Creating database '$dbName'..." -ForegroundColor Yellow
        psql -U $postgresUser -h $postgresHost -c "CREATE DATABASE $dbName;" 2>&1
        if ($?) {
            Write-Host "✓ Database created successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to create database" -ForegroundColor Red
        }
    }

    "drop" {
        Write-Host "Dropping database '$dbName'..." -ForegroundColor Yellow
        $confirm = Read-Host "Are you sure? (yes/no)"
        if ($confirm -eq "yes") {
            psql -U $postgresUser -h $postgresHost -c "DROP DATABASE IF EXISTS $dbName;" 2>&1
            if ($?) {
                Write-Host "✓ Database dropped" -ForegroundColor Green
            }
        } else {
            Write-Host "Cancelled" -ForegroundColor Yellow
        }
    }

    "reset" {
        Write-Host "Resetting database '$dbName'..." -ForegroundColor Yellow
        Write-Host "This will drop and recreate the database" -ForegroundColor Yellow
        $confirm = Read-Host "Are you sure? (yes/no)"

        if ($confirm -eq "yes") {
            Write-Host "Dropping database..." -ForegroundColor Cyan
            psql -U $postgresUser -h $postgresHost -c "DROP DATABASE IF EXISTS $dbName;" 2>$null

            Write-Host "Creating database..." -ForegroundColor Cyan
            psql -U $postgresUser -h $postgresHost -c "CREATE DATABASE $dbName;" 2>$null

            Write-Host "Running migrations..." -ForegroundColor Cyan
            Push-Location backend
            npm run migration:run

            Write-Host "Seeding database..." -ForegroundColor Cyan
            npm run seed
            Pop-Location

            Write-Host "✓ Database reset complete" -ForegroundColor Green
        } else {
            Write-Host "Cancelled" -ForegroundColor Yellow
        }
    }

    "seed" {
        Write-Host "Seeding database '$dbName'..." -ForegroundColor Yellow
        Push-Location backend
        npm run seed
        Pop-Location

        if ($?) {
            Write-Host "✓ Database seeded" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to seed database" -ForegroundColor Red
        }
    }

    "backup" {
        Write-Host "Backing up database to '$BackupFile'..." -ForegroundColor Yellow
        pg_dump -U $postgresUser -h $postgresHost $dbName -f $BackupFile

        if ($?) {
            $size = (Get-Item $BackupFile).Length / 1KB
            Write-Host "✓ Backup created successfully ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
        } else {
            Write-Host "✗ Backup failed" -ForegroundColor Red
        }
    }

    "restore" {
        if (-not (Test-Path $BackupFile)) {
            Write-Host "✗ Backup file '$BackupFile' not found" -ForegroundColor Red
            exit 1
        }

        Write-Host "Restoring database from '$BackupFile'..." -ForegroundColor Yellow
        $confirm = Read-Host "This will overwrite the current database. Continue? (yes/no)"

        if ($confirm -eq "yes") {
            psql -U $postgresUser -h $postgresHost -c "DROP DATABASE IF EXISTS $dbName;" 2>$null
            psql -U $postgresUser -h $postgresHost -c "CREATE DATABASE $dbName;" 2>$null
            psql -U $postgresUser -h $postgresHost $dbName -f $BackupFile

            if ($?) {
                Write-Host "✓ Restore complete" -ForegroundColor Green
            } else {
                Write-Host "✗ Restore failed" -ForegroundColor Red
            }
        } else {
            Write-Host "Cancelled" -ForegroundColor Yellow
        }
    }

    "status" {
        Write-Host "Database status:" -ForegroundColor Yellow
        psql -U $postgresUser -h $postgresHost -c "\l | grep $dbName"

        Write-Host ""
        Write-Host "Connections to $dbName`:" -ForegroundColor Yellow
        psql -U $postgresUser -h $postgresHost -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;" | Select-String $dbName
    }
}

Write-Host ""
