const taskForm = document.querySelector("#taskForm");
const taskTitle = document.querySelector("#taskTitle");
const taskCategory = document.querySelector("#taskCategory");
const taskDate = document.querySelector("#taskDate");
const taskList = document.querySelector("#taskList");
const filterTasks = document.querySelector("#filterTasks");
const taskSearch = document.querySelector("#taskSearch");
const emptyMessage = document.querySelector("#emptyMessage");
const submitButton = document.querySelector("#submitButton");
const cancelEditButton = document.querySelector("#cancelEditButton");

const totalTasks = document.querySelector("#totalTasks");
const pendingTasks = document.querySelector("#pendingTasks");
const completedTasks = document.querySelector("#completedTasks");

const STORAGE_KEY = "taskflowTasks";
let tasks = [];
let editingTaskId = null;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

document.querySelector("#todayDate").textContent =
  new Intl.DateTimeFormat("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  }).format(new Date());

taskDate.min = localDateString();

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved)) {
      tasks = saved.filter(task =>
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        typeof task.category === "string" &&
        typeof task.date === "string" &&
        typeof task.completed === "boolean"
      );
    }
  } catch (error) {
    console.error("Could not read saved tasks:", error);
    tasks = [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    alert("Your browser could not save this task. Check browser storage settings.");
    return false;
  }
}

function resetForm() {
  taskForm.reset();
  editingTaskId = null;
  submitButton.textContent = "+ Add task";
  cancelEditButton.hidden = true;
  document.querySelector("#formHeading").textContent = "Add a new task";
  taskDate.min = localDateString();
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = taskTitle.value.trim();
  const category = taskCategory.value;
  const date = taskDate.value;

  if (!title || !date) {
    alert("Please enter a task title and due date.");
    return;
  }

  if (editingTaskId) {
    const task = tasks.find(item => item.id === editingTaskId);
    if (!task) {
      alert("Task not found. Please try again.");
      resetForm();
      return;
    }

    const previous = { ...task };
    Object.assign(task, { title, category, date });

    if (!saveTasks()) {
      Object.assign(task, previous);
      return;
    }
  } else {
    const newTask = {
      id: makeId(),
      title,
      category,
      date,
      completed: false,
      createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    if (!saveTasks()) {
      tasks = tasks.filter(item => item.id !== newTask.id);
      return;
    }
  }

  resetForm();
  renderTasks();
});

function makeId() {
  if (globalThis.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toggleTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  const oldValue = task.completed;
  task.completed = !task.completed;

  if (!saveTasks()) {
    task.completed = oldValue;
    return;
  }
  renderTasks();
}

function editTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  editingTaskId = id;
  taskTitle.value = task.title;
  taskCategory.value = task.category;
  taskDate.value = task.date;
  taskDate.min = "";
  submitButton.textContent = "Save changes";
  cancelEditButton.hidden = false;
  document.querySelector("#formHeading").textContent = "Edit task";
  taskTitle.focus();
  taskForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function deleteTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  if (!confirm(`Delete "${task.title}"?`)) return;

  const previous = tasks;
  tasks = tasks.filter(item => item.id !== id);

  if (!saveTasks()) {
    tasks = previous;
    return;
  }

  if (editingTaskId === id) resetForm();
  renderTasks();
}

function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = `task-card${task.completed ? " is-complete" : ""}`;

  const main = document.createElement("div");
  main.className = "task-main";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "status-toggle";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark ${task.title} complete`);
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const copy = document.createElement("div");
  copy.className = "task-copy";

  const title = document.createElement("h3");
  title.textContent = task.title;

  const category = document.createElement("span");
  category.className = "category-pill";
  category.textContent = task.category;
  title.appendChild(category);

  const details = document.createElement("p");
  const due = document.createElement("span");
  due.textContent = `Due ${formatDate(task.date)}`;
  details.appendChild(due);

  const status = document.createElement("p");
  status.textContent = task.completed ? "Completed" : "Active";
  status.style.marginTop = "4px";
  status.style.color = task.completed ? "#12805c" : "#758099";

  copy.append(title, details, status);
  main.append(checkbox, copy);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "action-button edit-button";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => editTask(task.id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "action-button delete-button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  actions.append(editButton, deleteButton);
  card.append(main, actions);
  return card;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  }).format(date);
}

function renderTasks() {
  taskList.replaceChildren();

  totalTasks.textContent = tasks.length;
  pendingTasks.textContent = tasks.filter(task => !task.completed).length;
  completedTasks.textContent = tasks.filter(task => task.completed).length;

  const filter = filterTasks.value;
  const query = taskSearch.value.trim().toLowerCase();

  const visibleTasks = tasks.filter(task => {
    const matchesFilter =
      filter === "All" ||
      (filter === "Active" && !task.completed) ||
      (filter === "Completed" && task.completed);

    const matchesSearch =
      task.title.toLowerCase().includes(query) ||
      task.category.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  visibleTasks.forEach(task => taskList.appendChild(createTaskCard(task)));
  emptyMessage.hidden = visibleTasks.length > 0;

  if (visibleTasks.length === 0) {
    const heading = emptyMessage.querySelector("h3");
    const message = emptyMessage.querySelector("p");

    if (tasks.length === 0) {
      heading.textContent = "No tasks yet";
      message.textContent = "Add your first task above and make today productive.";
    } else {
      heading.textContent = "No matching tasks";
      message.textContent = "Try another search or filter.";
    }
  }
}

filterTasks.addEventListener("change", renderTasks);
taskSearch.addEventListener("input", renderTasks);
cancelEditButton.addEventListener("click", resetForm);

loadTasks();
renderTasks();
