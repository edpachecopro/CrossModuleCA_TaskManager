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
