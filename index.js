//requiring electron, fs and uuid
const electron = require("electron");
const fs = require("fs");
const uuid = require("uuid");


const { app, BrowserWindow, Menu, ipcMain } = electron;

//creating windows
let todayWindow;
// let createWindow;
// let listWindow;

let allTasks = [];

fs.readFile("db.json", (err, jsonTasks) => {
  if (!err) {
    const oldTasks = JSON.parse(jsonTasks);
    allTasks = oldTasks;
  }
});

app.on("ready", () => {
  todayWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true
    },
    fullscreen: false,
    width: 1080,
    height: 800,
    title: "Lucas, Edgar, Keith and Douglas"
  });
  todayWindow.loadURL(`file://${__dirname}/index.html`);
  todayWindow.on("closed", () => {
    const jsonTasks = JSON.stringify(allTasks);
    fs.writeFileSync("db.json", jsonTasks);

    app.quit();
    todayWindow = null;
  });

  const mainMenu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(mainMenu);
  
});

// const createWindowCreator = () => {
//   createWindow = new BrowserWindow({
//     webPreferences: {
//       nodeIntegration: true
//     },
//     width: 1024,
//     height: 800,
//     title: "Add a new Assignment"
//   });

//   createWindow.setMenu(null);

//   createWindow.loadURL(`file://${__dirname}/create.html`);
//   //here we can edit the html that this will call

//   createWindow.on("closed", () => (createWindow = null));
// };

// const listWindowCreator = () => {
//   listWindow = new BrowserWindow({
//     webPreferences: {
//       nodeIntegration: true
//     },
//     width: 1024,
//     height: 800,
//     title: "See all Assignments"
//   });

  // listWindow.setMenu(null);

  // listWindow.loadURL(`file://${__dirname}/list.html`);
  // //here we can edit the html that this will call

  // listWindow.on("closed", () => (listWindow = null));
// };

ipcMain.on("task:create", (event, task) => {
  task["id"] = uuid();
  task["done"] = 0;
  allTasks.push(task);

  sendTodayTasks();
  // createWindow.close();
});

ipcMain.on("task:request:list", event => {
  todayWindow.webContents.send("task:response:list", allTasks);
});

ipcMain.on("task:request:today", event => {
  sendTodayTasks();
});

ipcMain.on("task:done", (event, id) => {
  allTasks.forEach(task => {
    if (task.id === id) task.done = 1;
  });

  sendTodayTasks();
});

const sendTodayTasks = () => {
  const today = new Date().toISOString().slice(0, 10);
  const filtered = allTasks.filter(
    task => task.date === today
  );
  todayWindow.webContents.send("task:response:today", filtered);
};

const menuTemplate = [
  {
    label: "File",

    submenu: [
      // {
      //   label: "Add a new Task",
      //   //we can change the windowns name

      //   click() {
      //     createWindowCreator();
      //     //here we can determine what will happen when clicked here, this for example is calling
      //     //the contructor created above
      //   }
      // },

      // {
      //   label: "See all Tasks",

      //   click() {
      //     // listWindowCreator();	
      //   }
      // },

      {
        label: "Quit",

        accelerator: process.platform === "darwin" ? "Command+Q" : "Ctrl+Q",

        click() {
          app.quit();
        }
      }
    ]
  },
  {
    label: "View",
    submenu: [{ role: "reload" }]
  }
];
