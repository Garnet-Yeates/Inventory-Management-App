CREATE DATABASE TrackIt;
USE TrackIt;

CREATE TABLE TblClient (
	clientId INT NOT NULL,
    clientName CHAR(32) NOT NULL,
    PRIMARY KEY (clientId)
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
    unitOfMeasure CHAR(48) NOT NULL, # Hours, Miles, etc
	FOREIGN KEY (clientId) REFERENCES TblClient (clientId),
    PRIMARY KEY (serviceId, clientId)
);

# Many (TblChargedServicePricePoint) To One (TblChargedService)
CREATE TABLE TblChargedServicePricePoint (
	serviceId INT NOT NULL,
    startDate DATE NOT NULL,
    buyPrice INT NOT NULL,
    sellPrice INT NOT NULL,
    FOREIGN KEY (serviceId) REFERENCES TblChargedService (serviceId),
    PRIMARY KEY (serviceId, startDate)
);

CREATE TABLE TblItemType (
	clientId INT NOT NULL ,
	itemId INT NOT NULL AUTO_INCREMENT,
    itemCode CHAR (16) NOT NULL,
    itemName CHAR(48) NOT NULL,
    FOREIGN KEY (clientId) REFERENCES TblClient (clientId),
    PRIMARY KEY (itemId),
    CONSTRAINT UC_itemCode UNIQUE (itemCode, clientId)
);

# Many (TblItemPricePoint) To One (TblItemType)
CREATE TABLE TblItemPricePoint (
	itemId INT NOT NULL,
    startDate DATE NOT NULL,
    buyPrice INT NOT NULL,
    sellPrice INT NOT NULL,
    FOREIGN KEY (itemId) REFERENCES TblItemType (itemId),
    PRIMARY KEY (itemId, startDate)
);

# Many (TblItemInstance) To One (TblItemType)
CREATE TABLE TblItemInstance (
	itemId INT NOT NULL,
    datePurchased DATE NOT NULL,
    dateAdded DATE NOT NULL,
    quantity INT NOT NULL,
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

