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
let isAdminMode = false;
let points = 0;
let draggedTodo = null;
let belongings = [];

// キャラクター進化ステージ（海の生き物）
const characters = [
  '🐚', '🦀', '🦞', '🐙', '🦑', '🐠', '🐡', '🦈', '🐳', '👑',
  '🌊', '🐟', '🦐', '🦪', '🪼', '🧜', '💎', '⭐', '🌟', '✨',
  '🎆', '🎇', '🌅', '🏆', '🔱', '⚜️', '🦑', '🐠', '🦈', '🚀'
];

const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');
const clearBtn = document.getElementById('clearBtn');
const countDisplay = document.getElementById('count');
const filterBtns = document.querySelectorAll('.filter-btn');
const settingsBtn = document.getElementById('settingsBtn');
const passwordModal = document.getElementById('passwordModal');
const passwordInput = document.getElementById('passwordInput');
const passwordOkBtn = document.getElementById('passwordOkBtn');
const passwordCancelBtn = document.getElementById('passwordCancelBtn');
const pointsCount = document.getElementById('pointsCount');
const reloadBtn = document.getElementById('reloadBtn');
const pointsBadge = document.getElementById('pointsBadge');
const rewardsModal = document.getElementById('rewardsModal');
const rewardsCloseBtn = document.getElementById('rewardsCloseBtn');
const currentPointsDisplay = document.getElementById('currentPoints');
const youtubeReward = document.getElementById('youtubeReward');
const confirmRewardModal = document.getElementById('confirmRewardModal');
const confirmRewardOkBtn = document.getElementById('confirmRewardOkBtn');
const confirmRewardCancelBtn = document.getElementById('confirmRewardCancelBtn');
const confirmRewardText = document.getElementById('confirmRewardText');
const belongingsBtn = document.getElementById('belongingsBtn');
const belongingsModal = document.getElementById('belongingsModal');
const belongingsList = document.getElementById('belongingsList');
const belongingsInput = document.getElementById('belongingsInput');
const addBelongingBtn = document.getElementById('addBelongingBtn');
const belongingsInputSection = document.getElementById('belongingsInputSection');
const clearAllBelongingsBtn = document.getElementById('clearAllBelongingsBtn');
const belongingsCloseBtn = document.getElementById('belongingsCloseBtn');

// ポイント管理
function loadPoints() {
  db.collection('app').doc('settings').onSnapshot(doc => {
    if (doc.exists) {
      points = doc.data().points || 0;
    } else {
      points = 0;
    }
    updatePointsDisplay();
    console.log('ポイント読み込み:', points);
  }, error => {
    console.error('ポイント読み込みエラー:', error);
    points = 0;
    updatePointsDisplay();
  });
}

async function addPoints(amount = 1) {
  const multiplier = isMorningBonus() ? 2 : 1;
  points += amount * multiplier;
  updatePointsDisplay();
  await savePoints();
}

function isMorningBonus() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 9;
}

function updatePointsDisplay() {
  const level = Math.floor(points / 5);
  const character = characters[Math.min(level, characters.length - 1)];
  pointsCount.textContent = points;
  const characterSpan = document.getElementById('characterSpan');
  if (characterSpan) {
    characterSpan.textContent = character;
  }
}

async function savePoints() {
  try {
    await db.collection('app').doc('settings').set({
      points: points
    }, { merge: true });
    console.log('ポイント保存成功:', points);
  } catch (error) {
    console.error('ポイント保存エラー:', error);
  }
}

// Firestoreからリアルタイム読み込み
function loadTodos() {
  isLoading = true;
  db.collection('todos').onSnapshot(snapshot => {
    todos = [];
    snapshot.forEach(doc => {
      todos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    // orderフィールドでソート、なければcreatedAtでソート
    todos.sort((a, b) => {
      const aHasOrder = a.order !== undefined;
      const bHasOrder = b.order !== undefined;

      if (aHasOrder && bHasOrder) {
        return a.order - b.order;
      } else if (aHasOrder) {
        return 1; // aはorderがあるので後ろ
      } else if (bHasOrder) {
        return -1; // bはorderがあるので後ろ
      }
      return (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0);
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
    const maxOrder = todos.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
    await db.collection('todos').add({
      text: text,
      completed: false,
      order: maxOrder + 1,
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
  console.log('Delete called with id:', id);
  try {
    await db.collection('todos').doc(id).delete();
    console.log('Deleted successfully');
  } catch (error) {
    console.error('削除エラー:', error);
    alert('削除に失敗しました: ' + error.message);
  }
}

// Todoの完了状態を切り替え
async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    // 既に完了しているタスクは状態を変更できない
    if (todo.completed) {
      return;
    }

    try {
      await db.collection('todos').doc(id).update({
        completed: true
      });
      // 完了したらポイント加算
      addPoints(1);
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
    li.draggable = true;
    li.dataset.todoId = todo.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.completed;
    if (todo.completed) {
      checkbox.disabled = true;
    }
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text';
    textSpan.textContent = todo.text;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'todo-delete';
    if (!isAdminMode) {
      deleteBtn.classList.add('hidden');
    }
    deleteBtn.textContent = '🗑️ 削除';
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(deleteBtn);

    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragend', handleDragEnd);
    li.addEventListener('touchstart', handleTouchStart);
    li.addEventListener('touchmove', handleTouchMove);
    li.addEventListener('touchend', handleTouchEnd);

    todoList.appendChild(li);
  });

  updateCount();
}

// 残りのタスク数を更新
function updateCount() {
  const activeCount = todos.filter(todo => !todo.completed).length;
  countDisplay.textContent = activeCount;
}

// ドラッグアンドドロップ
function handleDragStart(e) {
  draggedTodo = todos.find(t => t.id === this.dataset.todoId);
  this.style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.style.borderTop = '3px solid #ff6b9d';
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();

  const targetTodo = todos.find(t => t.id === this.dataset.todoId);

  if (draggedTodo && targetTodo && draggedTodo.id !== targetTodo.id) {
    const draggedIndex = todos.indexOf(draggedTodo);
    const targetIndex = todos.indexOf(targetTodo);

    todos.splice(draggedIndex, 1);
    todos.splice(targetIndex, 0, draggedTodo);

    saveTodosOrder();
    renderTodos();
  }
}

function handleDragEnd(e) {
  this.style.opacity = '1';
  this.style.borderTop = 'none';
  document.querySelectorAll('.todo-item').forEach(item => {
    item.style.borderTop = 'none';
  });
}

// タッチイベント対応
let touchItem = null;
function handleTouchStart(e) {
  touchItem = this;
  draggedTodo = todos.find(t => t.id === this.dataset.todoId);
  this.style.opacity = '0.5';
}

function handleTouchMove(e) {
  if (!touchItem) return;
  e.preventDefault();

  const touch = e.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);

  if (element && element.classList.contains('todo-item') && element !== touchItem) {
    document.querySelectorAll('.todo-item').forEach(item => {
      item.style.borderTop = 'none';
    });
    element.style.borderTop = '3px solid #ff6b9d';
  }
}

function handleTouchEnd(e) {
  if (!touchItem) return;

  const touch = e.changedTouches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);

  if (element && element.classList.contains('todo-item') && element !== touchItem) {
    const targetTodo = todos.find(t => t.id === element.dataset.todoId);

    if (draggedTodo && targetTodo && draggedTodo.id !== targetTodo.id) {
      const draggedIndex = todos.indexOf(draggedTodo);
      const targetIndex = todos.indexOf(targetTodo);

      todos.splice(draggedIndex, 1);
      todos.splice(targetIndex, 0, draggedTodo);

      saveTodosOrder();
      renderTodos();
    }
  }

  touchItem.style.opacity = '1';
  touchItem.style.borderTop = 'none';
  document.querySelectorAll('.todo-item').forEach(item => {
    item.style.borderTop = 'none';
  });
  touchItem = null;
  draggedTodo = null;
}

async function saveTodosOrder() {
  const batch = db.batch();
  todos.forEach((todo, index) => {
    const docRef = db.collection('todos').doc(todo.id);
    batch.update(docRef, { order: index });
  });
  await batch.commit().catch(error => {
    console.error('順序保存エラー:', error);
  });
}

// 持ち物チェック関連関数
function loadBelongings() {
  db.collection('belongings').onSnapshot(snapshot => {
    belongings = [];
    snapshot.forEach(doc => {
      belongings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    belongings.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    renderBelongings();
  });
}

async function addBelonging() {
  const text = belongingsInput.value.trim();
  if (text === '') {
    alert('もちものを入力してね！');
    return;
  }

  try {
    const maxOrder = belongings.reduce((max, b) => Math.max(max, b.order ?? 0), 0);
    await db.collection('belongings').add({
      text: text,
      checked: false,
      order: maxOrder + 1,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    belongingsInput.value = '';
    belongingsInput.focus();
  } catch (error) {
    console.error('エラー:', error);
    alert('エラーが発生しました');
  }
}

async function toggleBelonging(id) {
  const belonging = belongings.find(b => b.id === id);
  if (belonging) {
    try {
      await db.collection('belongings').doc(id).update({
        checked: !belonging.checked
      });
    } catch (error) {
      console.error('更新エラー:', error);
    }
  }
}

async function deleteBelonging(id) {
  try {
    await db.collection('belongings').doc(id).delete();
  } catch (error) {
    console.error('削除エラー:', error);
    alert('削除に失敗しました: ' + error.message);
  }
}

async function clearAllBelongings() {
  const checkedBelongings = belongings.filter(b => b.checked);
  if (checkedBelongings.length === 0) {
    alert('チェック済みのもちものはないよ！');
    return;
  }

  try {
    const batch = db.batch();
    checkedBelongings.forEach(belonging => {
      const docRef = db.collection('belongings').doc(belonging.id);
      batch.update(docRef, { checked: false });
    });
    await batch.commit();
  } catch (error) {
    console.error('更新エラー:', error);
  }
}

function renderBelongings() {
  belongingsList.innerHTML = '';

  if (belongings.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.color = '#999';
    emptyMsg.textContent = 'もちものを追加してね！';
    belongingsList.appendChild(emptyMsg);
    return;
  }

  belongings.forEach(belonging => {
    const div = document.createElement('div');
    div.className = `belonging-item ${belonging.checked ? 'checked' : ''}`;
    div.dataset.belongingId = belonging.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'belonging-checkbox';
    checkbox.checked = belonging.checked;
    checkbox.addEventListener('change', e => {
      e.stopPropagation();
      toggleBelonging(belonging.id);
    });

    const textSpan = document.createElement('span');
    textSpan.className = 'belonging-text';
    textSpan.textContent = belonging.text;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'belonging-delete';
    deleteBtn.textContent = '🗑️ 削除';
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteBelonging(belonging.id);
    });

    if (!isAdminMode) {
      deleteBtn.style.display = 'none';
      belongingsInputSection.style.display = 'none';
    } else {
      deleteBtn.style.display = 'block';
      belongingsInputSection.style.display = 'flex';
    }

    // 行クリックでチェック状態をトグル
    div.addEventListener('click', () => toggleBelonging(belonging.id));

    div.appendChild(checkbox);
    div.appendChild(textSpan);
    div.appendChild(deleteBtn);
    belongingsList.appendChild(div);
  });
}

function showBelongingsModal() {
  belongingsModal.classList.add('show');
  if (isAdminMode) {
    belongingsModal.classList.add('admin-mode');
  } else {
    belongingsModal.classList.remove('admin-mode');
  }
  renderBelongings();
}

function hideBelongingsModal() {
  belongingsModal.classList.remove('show');
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

// パスワードモーダル
function showPasswordModal() {
  passwordModal.classList.add('show');
  passwordInput.value = '';
  passwordInput.focus();
}

function hidePasswordModal() {
  passwordModal.classList.remove('show');
}

function checkPassword() {
  const password = passwordInput.value;
  if (password === '2019') {
    isAdminMode = true;
    hidePasswordModal();
    document.body.classList.add('admin-mode');
    renderTodos();
    renderBelongings();
  } else {
    alert('パスワードが間違っています');
    passwordInput.value = '';
    passwordInput.focus();
  }
}

// 特典モーダル
function showRewardsModal() {
  currentPointsDisplay.innerHTML = '現在のポイント: <strong>' + points + '</strong>P';
  rewardsModal.classList.add('show');
}

function hideRewardsModal() {
  rewardsModal.classList.remove('show');
}

// 特典確認モーダル
function showConfirmRewardModal(rewardName, rewardCost) {
  if (points < rewardCost) {
    alert('ポイントが足りません！\n必要: ' + rewardCost + 'P, 現在: ' + points + 'P');
    return;
  }
  confirmRewardText.textContent = rewardName + 'に' + rewardCost + 'Pを使いますか？';
  confirmRewardModal.classList.add('show');
  confirmRewardModal.dataset.cost = rewardCost;
}

function hideConfirmRewardModal() {
  confirmRewardModal.classList.remove('show');
}

async function confirmUseReward() {
  const cost = parseInt(confirmRewardModal.dataset.cost);
  points -= cost;
  await savePoints();
  updatePointsDisplay();
  hideConfirmRewardModal();
  hideRewardsModal();
  alert('特典を獲得しました！');
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

settingsBtn.addEventListener('click', showPasswordModal);
passwordOkBtn.addEventListener('click', checkPassword);
passwordCancelBtn.addEventListener('click', hidePasswordModal);
passwordInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    checkPassword();
  }
});

pointsBadge.addEventListener('click', showRewardsModal);
rewardsCloseBtn.addEventListener('click', hideRewardsModal);
rewardsModal.addEventListener('click', e => {
  if (e.target === rewardsModal) {
    hideRewardsModal();
  }
});

youtubeReward.addEventListener('click', () => {
  showConfirmRewardModal('YouTube 30分', 10);
});

confirmRewardOkBtn.addEventListener('click', confirmUseReward);
confirmRewardCancelBtn.addEventListener('click', hideConfirmRewardModal);
confirmRewardModal.addEventListener('click', e => {
  if (e.target === confirmRewardModal) {
    hideConfirmRewardModal();
  }
});

reloadBtn.addEventListener('click', () => {
  location.reload();
});

belongingsBtn.addEventListener('click', showBelongingsModal);
belongingsCloseBtn.addEventListener('click', hideBelongingsModal);
belongingsModal.addEventListener('click', e => {
  if (e.target === belongingsModal) {
    hideBelongingsModal();
  }
});
clearAllBelongingsBtn.addEventListener('click', clearAllBelongings);
addBelongingBtn.addEventListener('click', addBelonging);
belongingsInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    addBelonging();
  }
});

// グローバルスコープに関数を登録（HTMLから呼び出せるように）
window.deleteTodo = deleteTodo;
window.toggleTodo = toggleTodo;

function updateMorningBonusDisplay() {
  const morningBonusEl = document.getElementById('morningBonus');
  if (morningBonusEl) {
    if (isMorningBonus()) {
      morningBonusEl.style.display = 'block';
    } else {
      morningBonusEl.style.display = 'none';
    }
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  loadPoints();
  loadTodos();
  loadBelongings();
  updateMorningBonusDisplay();
  // 毎分チェックして、朝のボーナス表示を更新
  setInterval(updateMorningBonusDisplay, 60000);
});
