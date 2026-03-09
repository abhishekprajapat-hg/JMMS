# JMMS Multi-Tenant ER Outline

## Core Tenancy

### `mandirs`
- `id` (PK, `MDR-*`)
- `name`, `address`, `pan`, `reg80G`, `trustNumber`, `letterhead`
- `timezone`, `isActive`
- `createdAt`, `updatedAt`

### `users` (Staff)
- `id` (PK)
- `username` (platform-unique for now)
- `passwordHash`
- `role` (`super_admin`, `trustee`, `admin`, `executive`)
- `mandirId` (FK -> `mandirs.id`, nullable for `super_admin`)
- `fullName`

## Devotee Identity (Global)

### `devoteeUsers`
- `id` (PK, global profile)
- `fullName`, `email`, `whatsapp`
- `passwordHash`
- `status`, `createdAt`, `lastLoginAt`
- `familyId` (current active family context, compatibility field)
- `mandirId` (current active mandir context, compatibility field)

### `devoteeAffiliations`
- `id` (PK)
- `devoteeUserId` (FK -> `devoteeUsers.id`)
- `mandirId` (FK -> `mandirs.id`)
- `familyId` (FK -> `families.familyId`)
- `isPrimary`, `status`, `joinedAt`

Relationship:
- One global devotee profile can link to many mandirs through `devoteeAffiliations`.
- Each affiliation points to a tenant-local family profile.

## Tenant-Scoped Operational Tables

All below include `mandirId` (FK -> `mandirs.id`) and must be queried with tenant scope:

- `families`
- `transactions`
- `paymentIntents`
- `expenses`
- `events`
- `eventRegistrations`
- `assets`
- `assetCheckouts`
- `poojaBookings`
- `approvalRequests`
- `cancellationLogs`
- `whatsappLogs`
- `whatsAppRetryQueue`

## Library Model (Global + Local)

### `contentLibrary`
- `id`
- `scope` (`global` or `mandir`)
- `mandirId` (nullable when `scope=global`)
- `type` (`ebook`, `video`)
- `title`, `description`, `url`, `thumbnailUrl`
- `tags[]`, `isPublished`, `sortOrder`
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

Behavior:
- Public library for a mandir = `global` content + that mandir’s `mandir` content.

## Finance Isolation Rule

For every transaction flow:
- `transactions.mandirId` is mandatory.
- `paymentIntents.mandirId` must match linked transaction/family mandir.
- Receipt generation and reconciliation execute only inside one tenant scope.

This is the key guarantee for isolated accounting between trusts.
