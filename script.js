// function list() {
//   const electron = require("electron");
//   const { ipcRenderer } = electron;
//   ipcRenderer.send("task:request:list");
//   ipcRenderer.on("task:response:list", (event, tasks) => {
//     const listDiv = document.getElementById("list");
//     tasks.forEach((task) => {
//       const taskDiv = document.createElement("div");
//       const nameTask = document.createElement("p");
//       nameTask.innerHTML = `Task: ${task.name}`;
//       const dateTask = document.createElement("p");
//       dateTask.innerHTML = `Due Date: ${task.date}`;
//       const doneTask = document.createElement("p");
//       doneTask.innerHTML = `Done: ${task.done ? "Yes" : "No"}`;
//       const hr = document.createElement("hr");
//       taskDiv.appendChild(nameTask);
//       taskDiv.appendChild(dateTask);
//       taskDiv.appendChild(doneTask);
//       taskDiv.appendChild(hr);
//       listDiv.append(taskDiv);
//     });
//   });
// }

function create() {
  const electron = require("electron");
  const { ipcRenderer } = electron;
  const form = document.getElementById("form");
  const elements = {};
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    for (let i = 0; i < form.elements.length; i++) {
      if (form.elements[i].type !== "submit")
        elements[form.elements[i].name] = form.elements[i].value;
    }
    ipcRenderer.send("task:create", elements);
  });
}
