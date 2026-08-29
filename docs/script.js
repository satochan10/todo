let todos = [];
let currentFilter = 'all';

const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');
const clearBtn = document.getElementById('clearBtn');
const countDisplay = document.getElementById('count');
const filterBtns = document.querySelectorAll('.filter-btn');

// ローカルストレージから読み込み
function loadTodos() {
  const saved = localStorage.getItem('todos');
  if (saved) {
    todos = JSON.parse(saved);
  }
}

// ローカルストレージに保存
function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

// Todoを追加
function addTodo() {
  const text = todoInput.value.trim();
  if (text === '') {
    alert('やることを入力してね！ ✏️');
    return;
  }

  const todo = {
    id: Date.now(),
    text: text,
    completed: false,
    createdAt: new Date().toLocaleString('ja-JP')
  };

  todos.push(todo);
  saveTodos();
  renderTodos();
  todoInput.value = '';
  todoInput.focus();
}

// Todoを削除
function deleteTodo(id) {
  todos = todos.filter(todo => todo.id !== id);
  saveTodos();
  renderTodos();
}

// Todoの完了状態を切り替え
function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    renderTodos();
  }
}

// 完了したTodoをすべて削除
function clearCompleted() {
  const completedCount = todos.filter(t => t.completed).length;
  if (completedCount === 0) {
    alert('完了したタスクはないよ！ 🎉');
    return;
  }

  if (confirm(`${completedCount}個の完了したタスクを削除してもいい？`)) {
    todos = todos.filter(todo => !todo.completed);
    saveTodos();
    renderTodos();
  }
}

// Todoを表示
function renderTodos() {
  todoList.innerHTML = '';

  let filteredTodos = todos;

  if (currentFilter === 'active') {
    filteredTodos = todos.filter(todo => !todo.completed);
  } else if (currentFilter === 'completed') {
    filteredTodos = todos.filter(todo => todo.completed);
  }

  if (filteredTodos.length === 0 && todos.length > 0) {
    todoList.style.display = 'none';
    emptyState.classList.add('show');
  } else {
    emptyState.classList.remove('show');
    todoList.style.display = 'block';
  }

  filteredTodos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;

    li.innerHTML = `
      <input
        type="checkbox"
        class="todo-checkbox"
        ${todo.completed ? 'checked' : ''}
        onchange="toggleTodo(${todo.id})"
      >
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <button class="todo-delete" onclick="deleteTodo(${todo.id})">🗑️ 削除</button>
    `;

    todoList.appendChild(li);
  });

  updateCount();
}

// 残りのタスク数を更新
function updateCount() {
  const activeCount = todos.filter(todo => !todo.completed).length;
  countDisplay.textContent = activeCount;
}

// XSS対策
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// イベントリスナー
addBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    addTodo();
  }
});

clearBtn.addEventListener('click', clearCompleted);

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTodos();
  });
});

// 初期化
loadTodos();
renderTodos();
