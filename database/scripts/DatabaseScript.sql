
DROP DATABASE TrackIt;
CREATE DATABASE TrackIt;
USE TrackIt;

CREATE TABLE Session (
	sessionUUID CHAR(36) NOT NULL PRIMARY KEY,
    clientId INT NOT NULL,
    isCanceled BOOL NOT NULL,
    expiresAt BIGINT NOT NULL
);

# Add unclustered index on userIdentifier since we lookup with this a lot
CREATE TABLE Client (
	clientId INT NOT NULL AUTO_INCREMENT,
    companyName CHAR(32) NOT NULL,
    userName CHAR(16) NOT NULL,
    userIdentifier CHAR(16) NOT NULL,
    hashPassword CHAR(100) NOT NULL,
    PRIMARY KEY (clientId),
	CONSTRAINT UC_userIdentifier UNIQUE (userIdentifier)
);

# Flesh this out more
CREATE TABLE Customer (
	clientId INT NOT NULL,
	customerId INT NOT NULL AUTO_INCREMENT,
    customerFirstName CHAR(32) NOT NULL,
	customerMiddleName CHAR(32) NULL,
    customerLastName CHAR(32) NOT NULL,
    dateAdded DATE NOT NULL,
	deleted BOOL NULL DEFAULT FALSE,
    FOREIGN KEY (clientId) REFERENCES Client (clientId),
    PRIMARY KEY (customerId)
);

# Many (CustomerAddress) To One (Customer)
CREATE TABLE CustomerAddress (
	customerId INT NOT NULL,
	customerAddressId INT AUTO_INCREMENT,
	address CHAR(64) NOT NULL,
    town CHAR(24) NOT NULL,
	zip CHAR(5) NOT NULL,
	state CHAR(2) NOT NULL,
    deleted BOOL NULL DEFAULT FALSE,
	FOREIGN KEY (customerId) REFERENCES Customer (customerId),
    PRIMARY KEY (customerAddressId)
);

# Many (CustomerContact) To One (Customer)
# Handles cases for many types of ways of contacting customers (email, phone, custom, etc)
CREATE TABLE CustomerContact (
	customerContactId INT AUTO_INCREMENT,
	customerId INT NOT NULL,
	contactType CHAR(16) NOT NULL, # Email/Cell/Home
    contactValue CHAR(48) NOT NULL,
	deleted BOOL NULL DEFAULT FALSE,
    FOREIGN KEY (customerId) REFERENCES Customer (customerId),
    PRIMARY KEY (customerContactId)
);

CREATE TABLE ChargedService (
	clientId INT NOT NULL,
	serviceId INT NOT NULL AUTO_INCREMENT,
    defaultPricePerUnit DECIMAL(7, 2),
    unitOfMeasure CHAR(48) NOT NULL, # Hours, Miles, etc
	FOREIGN KEY (clientId) REFERENCES Client (clientId),
    PRIMARY KEY (serviceId, clientId)
);

CREATE TABLE ItemType (
	clientId INT NOT NULL ,
	itemTypeId INT NOT NULL AUTO_INCREMENT,
	itemName CHAR(64) NOT NULL,
    itemCode CHAR (24) NOT NULL,
    itemDescription TEXT(512) NULL,
    defaultBuyPrice DECIMAL(6, 2) NOT NULL,
    defaultSellPrice DECIMAL(6, 2) NOT NULL,
    isActive BOOL NOT NULL DEFAULT TRUE,
    FOREIGN KEY (clientId) REFERENCES Client (clientId),
    PRIMARY KEY (itemTypeId),
    CONSTRAINT UC_itemCode UNIQUE (itemCode, clientId)
);

# Many (ItemInstance) To One (ItemType)
CREATE TABLE ItemInstance (
	itemInstanceId INT NOT NULL AUTO_INCREMENT,
	itemTypeId INT NOT NULL,
    datePurchased DATE NOT NULL,
    dateAdded DATE NOT NULL,
    quantity INT NOT NULL,
    buyPrice DECIMAL(6, 2) NOT NULL,
	sellPrice DECIMAL(6, 2) NOT NULL,
    FOREIGN KEY (itemTypeId) REFERENCES ItemType (itemTypeId),
    PRIMARY KEY (itemInstanceId),
	CONSTRAINT UC_itemType UNIQUE (itemTypeId, datePurchased, dateAdded, buyPrice, sellPrice)
);

# Many (Invoice) To One (Customer)
CREATE TABLE Invoice (
    invoiceId INT NOT NULL AUTO_INCREMENT,
    customerId INT NOT NULL,
    FOREIGN KEY (customerId) REFERENCES Customer (customerId),
    PRIMARY KEY (invoiceId)
);

INSERT INTO Client (companyName, userName, userIdentifier, hashPassword)
VALUES ("Garnet Well and Pump Service", "TestUser", "testuser", "$2b$10$laGVhlfiRlyC54AfV6LKLuuELeGlcX.ZTEvVSCOYebjtW4pPrzguS");
