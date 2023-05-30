
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
	CONSTRAINT UC_itemCode UNIQUE (userIdentifier)
);

# Flesh this out more
CREATE TABLE Customer (
	clientId INT NOT NULL,
	customerId INT NOT NULL AUTO_INCREMENT,
    customerName CHAR(32) NOT NULL,
    dateAdded DATE NOT NULL,
    FOREIGN KEY (clientId) REFERENCES Client (clientId),
    PRIMARY KEY (customerId)
);

# Many (CustomerAddress) To One (Customer)
CREATE TABLE CustomerAddress (
	customerId INT NOT NULL,
	addressId INT AUTO_INCREMENT,
	address CHAR(64),
    zip CHAR(5),
    town CHAR(24),
	FOREIGN KEY (customerId) REFERENCES Customer (customerId),
    PRIMARY KEY (addressId)
);

# Many (CustomerContact) To One (Customer)
# Handles cases for many types of ways of contacting customers (email, phone, custom, etc)
CREATE TABLE CustomerContact (
	contactId INT AUTO_INCREMENT,
	customerId INT NOT NULL,
	contactType CHAR(16) NOT NULL, # Email/Cell/Home
    contactValue CHAR(16) NOT NULL,
    FOREIGN KEY (customerId) REFERENCES Customer (customerId),
    PRIMARY KEY (contactId)
);

CREATE TABLE ChargedService (
	clientId INT NOT NULL,
	serviceId INT NOT NULL AUTO_INCREMENT,
    defaultPricePerUnit DECIMAL(5, 2),
    unitOfMeasure CHAR(48) NOT NULL, # Hours, Miles, etc
	FOREIGN KEY (clientId) REFERENCES Client (clientId),
    PRIMARY KEY (serviceId, clientId)
);

CREATE TABLE ItemType (
	clientId INT NOT NULL ,
	itemId INT NOT NULL AUTO_INCREMENT,
	itemName CHAR(64) NOT NULL,
    itemCode CHAR (24) NOT NULL,
	itemCodeIdentifier CHAR(24) NOT NULL,
    itemDescription TEXT(512) NULL,
    defaultBuyPrice DECIMAL(4, 2) NOT NULL,
    defaultSellPrice DECIMAL(4, 2) NOT NULL,
    FOREIGN KEY (clientId) REFERENCES Client (clientId),
    PRIMARY KEY (itemId),
    CONSTRAINT UC_itemCode UNIQUE (itemCodeIdentifier, clientId)
);

# Many (ItemInstance) To One (ItemType)
CREATE TABLE ItemInstance (
	itemId INT NOT NULL,
    datePurchased DATE NOT NULL,
    dateAdded DATE NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(4, 2) NOT NULL,
    FOREIGN KEY (itemId) REFERENCES ItemType (itemId),
    PRIMARY KEY (itemId, datePurchased)
);

# Many (Invoice) To One (Customer)
CREATE TABLE Invoice (
    invoiceId INT NOT NULL AUTO_INCREMENT,
    customerId INT NOT NULL,
    FOREIGN KEY (customerId) REFERENCES Customer (customerId),
    PRIMARY KEY (invoiceId)
);

INSERT INTO Client (companyName, userName, userIdentifier, hashPassword)
VALUES ("Garnet Well and Pump Service", "GarnetTheYet", "garnettheyet", "$2b$10$fYez5NsvsON.loYRvs2zHuTQz0EWjsXJjlDSrWlhnXT0IYwQ2UolS");

INSERT INTO ItemType (clientId, itemCode, itemCodeIdentifier, itemName, defaultBuyPrice, defaultSellPrice)
VALUES (1, "item1", "item1", "Item One", 2, 2.2);