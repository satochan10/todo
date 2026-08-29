// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyC9-N7Z3iOizGqfPVj0-Nz2BH_neZBoPMA",
  authDomain: "todo-app-1fac3.firebaseapp.com",
  projectId: "todo-app-1fac3",
  storageBucket: "todo-app-1fac3.firebasestorage.app",
  messagingSenderId: "469318704626",
  appId: "1:469318704626:web:948d455d9d32fb29285f6b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let todos = [];
let currentFilter = 'all';
let isLoading = false;

const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');
const clearBtn = document.getElementById('clearBtn');
const countDisplay = document.getElementById('count');
const filterBtns = document.querySelectorAll('.filter-btn');

// Firestoreからリアルタイム読み込み
function loadTodos() {
  isLoading = true;
  db.collection('todos').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    todos = [];
    snapshot.forEach(doc => {
      todos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    isLoading = false;
    renderTodos();
  });
}

// Firestoreに保存
async function saveTodo(todo) {
  await db.collection('todos').add({
    text: todo.text,
    completed: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Todoを追加
async function addTodo() {
  const text = todoInput.value.trim();
  if (text === '') {
    alert('やることを入力してね！ ✏️');
    return;
  }

  try {
    await db.collection('todos').add({
      text: text,
      completed: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    todoInput.value = '';
    todoInput.focus();
  } catch (error) {
    console.error('エラー:', error);
    alert('エラーが発生しました');
  }
}

// Todoを削除
async function deleteTodo(id) {
  try {
    await db.collection('todos').doc(id).delete();
  } catch (error) {
    console.error('削除エラー:', error);
  }
}

// Todoの完了状態を切り替え
async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    try {
      await db.collection('todos').doc(id).update({
        completed: !todo.completed
      });
    } catch (error) {
      console.error('更新エラー:', error);
    }
  }
}

// 完了したTodoをすべて削除
async function clearCompleted() {
  const completedTodos = todos.filter(t => t.completed);
  if (completedTodos.length === 0) {
    alert('完了したタスクはないよ！ 🎉');
    return;
  }

  if (confirm(`${completedTodos.length}個の完了したタスクを削除してもいい？`)) {
    try {
      for (const todo of completedTodos) {
        await db.collection('todos').doc(todo.id).delete();
      }
    } catch (error) {
      console.error('削除エラー:', error);
    }
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
document.addEventListener('DOMContentLoaded', () => {
  loadTodos();
});
