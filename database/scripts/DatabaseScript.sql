
DROP DATABASE TrackIt;
CREATE DATABASE TrackIt;
USE TrackIt;

CREATE TABLE TblSession (
	sessionUUID CHAR(36) NOT NULL PRIMARY KEY,
    clientId INT NOT NULL,
    isCanceled BOOL NOT NULL,
    expiresAt BIGINT NOT NULL
);

# Add unclustered index on userIdentifier since we lookup with this a lot
CREATE TABLE TblClient (
	clientId INT NOT NULL AUTO_INCREMENT,
    clientName CHAR(32) NOT NULL,
    userName CHAR(16) NOT NULL,
    userIdentifier CHAR(16) NOT NULL,
    hashPassword CHAR(100) NOT NULL,
    PRIMARY KEY (clientId),
	CONSTRAINT UC_itemCode UNIQUE (userIdentifier)
);

# Flesh this out more
CREATE TABLE TblCustomer (
	clientId INT NOT NULL,
	customerId INT NOT NULL AUTO_INCREMENT,
    customerName CHAR(32) NOT NULL,
    dateAdded DATE NOT NULL,
    FOREIGN KEY (clientId) REFERENCES TblClient (clientId),
    PRIMARY KEY (customerId)
);

# Many (TblCustomerAddress) To One (TblCustomer)
CREATE TABLE TblCustomerAddress (
	customerId INT NOT NULL,
	addressId INT AUTO_INCREMENT,
	address CHAR(64),
    zip CHAR(5),
    town CHAR(24),
	FOREIGN KEY (customerId) REFERENCES TblCustomer (customerId),
    PRIMARY KEY (addressId)
);

# Many (TblCustomerContact) To One (TblCustomer)
# Handles cases for many types of ways of contacting customers (email, phone, custom, etc)
CREATE TABLE TblCustomerContact (
	contactId INT AUTO_INCREMENT,
	customerId INT NOT NULL,
	contactType CHAR(16) NOT NULL, # Email/Cell/Home
    contactValue CHAR(16) NOT NULL,
    FOREIGN KEY (customerId) REFERENCES TblCustomer (customerId),
    PRIMARY KEY (contactId)
);

CREATE TABLE TblChargedService (
	clientId INT NOT NULL,
	serviceId INT NOT NULL AUTO_INCREMENT,
    defaultPricePerUnit DECIMAL(5, 2),
    unitOfMeasure CHAR(48) NOT NULL, # Hours, Miles, etc
	FOREIGN KEY (clientId) REFERENCES TblClient (clientId),
    PRIMARY KEY (serviceId, clientId)
);

CREATE TABLE TblItemType (
	clientId INT NOT NULL ,
	itemId INT NOT NULL AUTO_INCREMENT,
    itemCode CHAR (16) NOT NULL,
    itemName CHAR(48) NOT NULL,
    defaultBuyPrice DECIMAL(5, 2) NOT NULL,
    defaultSellPrice DECIMAL(5, 2) NOT NULL,
    FOREIGN KEY (clientId) REFERENCES TblClient (clientId),
    PRIMARY KEY (itemId),
    CONSTRAINT UC_itemCode UNIQUE (itemCode, clientId)
);

# Many (TblItemInstance) To One (TblItemType)
CREATE TABLE TblItemInstance (
	itemId INT NOT NULL,
    datePurchased DATE NOT NULL,
    dateAdded DATE NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(5, 2) NOT NULL,
    FOREIGN KEY (itemId) REFERENCES TblItemType (itemId),
    PRIMARY KEY (itemId, datePurchased)
);

# Many (TblInvoice) To One (TblCustomer)
CREATE TABLE TblInvoice (
    invoiceId INT NOT NULL AUTO_INCREMENT,
    customerId INT NOT NULL,
    FOREIGN KEY (customerId) REFERENCES TblCustomer (customerId),
    PRIMARY KEY (invoiceId)
);

