function list(){
    const electron = require("electron");
    const { ipcRenderer } = electron;
    ipcRenderer.send("appointment:request:list");
    ipcRenderer.on("appointment:response:list", (event, appointments) => {
      const listDiv = document.getElementById("list");
      appointments.forEach((appointment) => {
        const appointmentDiv = document.createElement("div");
        const nameParagraph = document.createElement("p");
        nameParagraph.innerHTML = `Name: ${appointment.name}`;
        const numberParagraph = document.createElement("p");
        numberParagraph.innerHTML = `Phone Number: ${appointment.number}`;
        const dateParagraph = document.createElement("p");
        dateParagraph.innerHTML = `Date: ${appointment.date}`;
        const timeParagraph = document.createElement("p");
        timeParagraph.innerHTML = `Time: ${appointment.time}`;
        const symptomsParagraph = document.createElement("p");
        symptomsParagraph.innerHTML = `Symptoms: ${appointment.symptoms}`;
        const doneParagraph = document.createElement("p");
        doneParagraph.innerHTML = `Done: ${appointment.done ? "Yes" : "No"}`;
        const hr = document.createElement("hr");
        appointmentDiv.appendChild(nameParagraph);
        appointmentDiv.appendChild(numberParagraph);
        appointmentDiv.appendChild(dateParagraph);
        appointmentDiv.appendChild(timeParagraph);
        appointmentDiv.appendChild(symptomsParagraph);
        appointmentDiv.appendChild(doneParagraph);
        appointmentDiv.appendChild(hr);
        listDiv.append(appointmentDiv);
      });
    });
}

function create(){
const electron = require("electron");
const { ipcRenderer } = electron;
const form = document.getElementById("form");
const elements = {};
form.addEventListener("submit", event => {
event.preventDefault();
for (let i = 0; i < form.elements.length; i++) {
if (form.elements[i].type !== "submit")
elements[form.elements[i].name] = form.elements[i].value;
}
ipcRenderer.send("task:create", elements);
});
}