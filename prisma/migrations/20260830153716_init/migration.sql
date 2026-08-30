-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "atprotoDid" TEXT,
    "atprotoHandle" TEXT,
    "atprotoAvatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "SavedRoute" (
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

-- CreateTable
CREATE TABLE "AtprotoOauthState" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "state" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AtprotoOauthSession" (
    "did" TEXT NOT NULL PRIMARY KEY,
    "session" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AtprotoAuthTicket" (
    "tokenHash" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "userId" TEXT,
    "did" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_atprotoDid_key" ON "User"("atprotoDid");
