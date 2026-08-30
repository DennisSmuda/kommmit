-- The new columns have no sensible backfill (origin/destination labels and
-- elevation stats aren't recoverable from what was stored), and this feature
-- hasn't shipped yet, so existing rows are dropped rather than migrated.
DELETE FROM "SavedRoute";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SavedRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originLabel" TEXT NOT NULL,
    "destinationLabel" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "distanceMeters" REAL NOT NULL,
    "durationSeconds" REAL NOT NULL,
    "ascentMeters" REAL NOT NULL,
    "descentMeters" REAL NOT NULL,
    "minElevationMeters" REAL NOT NULL,
    "maxElevationMeters" REAL NOT NULL,
    "gpx" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedRoute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SavedRoute" ("createdAt", "distanceMeters", "durationSeconds", "gpx", "id", "kind", "name", "userId") SELECT "createdAt", "distanceMeters", "durationSeconds", "gpx", "id", "kind", "name", "userId" FROM "SavedRoute";
DROP TABLE "SavedRoute";
ALTER TABLE "new_SavedRoute" RENAME TO "SavedRoute";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
