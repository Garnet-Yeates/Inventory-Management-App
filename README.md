# Setting up this app to run on your computer

## Prerequisites

### General Workloads

You will definitely want to have [VS Code](https://code.visualstudio.com/download) to run our application. Its integrated terminal makes it easy to have a split-view between client and server and it has many
features such as syntax highlighting, some compile-time error detection, auto completion, and ability to open different folders in different windows/screens.

### Database Workloads

For our database we use MySQL. It is preferred to use MySQL workbench since it is easy to use and user-friendly

There is an [installer](https://dev.mysql.com/downloads/file/?id=518835) for it linked here that should be able to install workbench with all of the required workloads:
- MySQL Server
- MySQL Shell 
- MySQL Router
- MySQL Connectors

At some point when installing/launching MySQL workbench it will ask you to create a database user. The default username is root and you must set a password. You are allowed to do whatever username or 
password you want, but make sure that the port is `3306` (which is the default anyways). Remember this username and password that you created as it will be needed to connect the server to the database.

### Server workloads

To be able to run the server, you will need [Node.js](https://nodejs.org/en/download) since it is the runtime environment that our server works on. 

### Web-App

To run the web-app you will also need Node.js (linked above) since React is also built as a Node package.

## Forking the repository

Create a [fork](https://github.com/Garnet-Yeates/Inventory-Management-App/fork) of this repository using the embedded link or clicking the `Fork` button on the top right of the main github page here. This requires you to have
[Git](https://git-scm.com/downloads), although you could also just [download the zip](https://github.com/Garnet-Yeates/Inventory-Management-App/archive/refs/heads/main.zip) for the repository using this link or the green `Code` 
button on the main github page.

## Opening With VS Code

Once you have forked the repository (or downloaded and extracted the source code), you should have access to a main folder called `Inventory-Management-App`. Right click on this folder and press "Open with VS Code".

Once you have opened it up in VS Code, your file structure should look something like this

![](https://i.gyazo.com/be40ab4111e7a3ac80692b11ae370fab.png)

## Set up Database with MySQL Workbench

Open up MySQL workbench and connect to your local instance (with the username and password you created earlier). Once you are in, click this button to import an existing SQL script

![](https://i.gyazo.com/d4514e907fbc525dd96ed809a41c839f.png)

This SQL script is located in `Inventory-Management-App/database/scripts` and it is called `DatabaseScript.sql`.

Once you have opened this script, delete the line of code at the top that says

```mysql
DROP DATABASE TrackIt;
```

After you have done this, press the lightning bolt button that says "Execute the selected portion of the script, or everything if there is nothing selected" and make sure you have nothing selected
so the whole script runs. After this you can add the line of code that you removed back (if you want).

## Set Up REST API Server in VS Code

### Download Node Modules

Open up a new terminal (or press the split terminal button within the previous terminal itself). The starting directory of this terminal should look like

```
Inventory-Management-App>
```

Type the command `cd server` to change directory to the server directory. This directory contains a package.json that declares that this is a Node module.

```
Inventory-Management-App> cd server
```

Type the `npm install` command to install all node package dependencies that are specified in the package.json.

```
Inventory-Management-App/server> npm install
```

### Setting up environment variables

There are some things that I cannot post on GitHub as it will give away revealing information. Examples of this include the password used to sign the JWT tokens for authorization, as well
as my database username or password. These are stored in a file within `Inventory-Management-App/Server` called `.env` and it is read by the server. This `.env` file is within the `.gitignore`
so that it does not show up in this online repository.

In order for the server to function properly, you will need to right click on the `server` folder within VS Code and create a new file, naming it `.env`.

Within this file you should paste this information, changing it accordingly:

```
JWT_SECRET="YourSecretHere"
DATABASE_USERNAME="yourDatabaseUserHere"
DATABASE_PASSWORD="yourPasswordHere"
```

The `JWT_SECRET` can be whatever you want but keep in mind there is probably a max length to don't make it too long. The `DATABASE_USERNAME` and `DATABASE_PASSWORD` must be equivalent
to the ones you set up when installing/launching MySQL workbench.

Here is an example of a `.env` file:

```
JWT_SECRET="ManageYourInventory"
DATABASE_USERNAME="root"
DATABASE_PASSWORD="$uper$ecurePassword1#"
```

### Running the Server

After doing this the server should be set up. Whenever you want to start the web app, make sure you are in the `/app` sub-directory and type `npm start`. Example:

```
Inventory-Management-App/server> npm start
```

## Set Up Web App in VS Code

### Download Node Modules

Open up a new terminal in VS code by clicking `Terminal` at the top and then pressing `New Terminal`. The starting directory of this terminal should look like

```
Inventory-Management-App>
```

Type the command `cd app` to change directory to the web-app directory. This directory contains a package.json that declares that this is a Node module. The terminal should now look like this:

```
Inventory-Management-App> cd app
```

Type the `npm install` command to install all node package dependencies that are specified in the package.json

```
Inventory-Management-App/app> npm install
```

### Running the Web App

After doing this the web app should be set up. Whenever you want to start the web app, make sure you are in the `/app` sub-directory and type `npm start`. Example:

```
Inventory-Management-App/app> npm start
```

Note: Make sure the web-app runs on port 3000 because that is the only origin that CORS (cross-origin resource sharing) is activated on. If it is on a different port and you do not change this block of code
```js
app.use(cors({
    credentials: true,
    origin: [
        `http://localhost:${3000}`,
        `https://localhost:${3000}`
    ]
}));
```
within `Inventory-Management-App/src/server/server.js`, then HTTP requests to the server from the web-app will fail.

## Completion

Once those steps above are complete, start up the server and then start up the web app and it should be all good to go.


