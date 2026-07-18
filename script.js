document.addEventListener('DOMContentLoaded', () => {
    // === ESTADO GLOBAL ===
    let currentUser = localStorage.getItem('usuarioLogado');
    let tasks = [];
    let currentDateObj = new Date();
    let authMode = 'login'; // 'login' ou 'register'

    // === CACHE DE ELEMENTOS ===
    const authScreen = document.getElementById('authScreen');
    const appWrapper = document.getElementById('appWrapper');
    const authForm = document.getElementById('authForm');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    
    // === INICIALIZAÇÃO ===
    init();

    function init() {
        applyTheme();
        if (currentUser) {
            iniciarApp();
        } else {
            authScreen.style.display = 'flex';
            appWrapper.style.display = 'none';
        }
        setupAuthListeners();
        setupAppListeners();
    }

    // === LÓGICA DE AUTENTICAÇÃO ===
    function setupAuthListeners() {
        const tabLogin = document.getElementById('tabLogin');
        const tabRegister = document.getElementById('tabRegister');

        tabLogin.addEventListener('click', () => {
            authMode = 'login';
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            authSubmitBtn.innerText = 'Entrar';
        });

        tabRegister.addEventListener('click', () => {
            authMode = 'register';
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            authSubmitBtn.innerText = 'Criar Conta';
        });

        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = authEmail.value.trim().toLowerCase();
            const senha = authPassword.value;

            if (authMode === 'register') {
                criarContaLocal(email, senha);
            } else {
                fazerLoginLocal(email, senha);
            }
        });

        document.getElementById('btnLogout').addEventListener('click', logout);
    }

    function criarContaLocal(email, senha) {
        let usuarios = JSON.parse(localStorage.getItem('bancoUsuarios')) || {};
        if (usuarios[email]) {
            alert("Esta conta já existe! Tente fazer login.");
            return;
        }
        usuarios[email] = { senha: senha };
        localStorage.setItem('bancoUsuarios', JSON.stringify(usuarios));
        fazerLoginLocal(email, senha);
    }

    function fazerLoginLocal(email, senha) {
        let usuarios = JSON.parse(localStorage.getItem('bancoUsuarios')) || {};
        if (usuarios[email] && usuarios[email].senha === senha) {
            efetuarAcesso(email);
        } else {
            alert("E-mail ou senha incorretos.");
        }
    }

    // O Google chama essa função globalmente
    window.lidarComRespostaGoogle = function(response) {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        efetuarAcesso(payload.email);
    }

    function efetuarAcesso(email) {
        currentUser = email;
        localStorage.setItem('usuarioLogado', email);
        authEmail.value = ''; authPassword.value = '';
        iniciarApp();
    }

    function logout() {
        currentUser = null;
        tasks = [];
        localStorage.removeItem('usuarioLogado');
        authScreen.style.display = 'flex';
        appWrapper.style.display = 'none';
    }

    // === TRANSIÇÃO PARA O APP ===
    function iniciarApp() {
        authScreen.style.display = 'none';
        appWrapper.style.display = 'flex';
        document.getElementById('userDisplayEmail').innerText = currentUser;
        
        // Carrega as tarefas exclusivas do usuário
        tasks = JSON.parse(localStorage.getItem(`taskMasterData_${currentUser}`)) || [];
        updateDisplay();
        checkUpcomingDeadlines();
    }

    // === GERENCIAMENTO DO APP ===
    function setupAppListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const targetView = e.target.getAttribute('data-target');
                document.querySelectorAll('.view').forEach(v => {
                    v.classList.remove('active');
                    if (v.id === targetView) v.classList.add('active');
                });
                if(targetView === 'calendar') renderCalendar();
            });
        });

        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('taskMasterTheme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });

        // Modais e formulário
        document.getElementById('btnNewTask').addEventListener('click', openModal);
        document.getElementById('closeModal').addEventListener('click', closeModal);
        document.getElementById('cancelModal').addEventListener('click', closeModal);
        document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);

        // Controles e Filtros
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', updateDisplay);
        document.getElementById('filterSelect').addEventListener('change', updateDisplay);
        document.getElementById('sortSelect').addEventListener('change', updateDisplay);

        document.getElementById('btnMarkAll').addEventListener('click', () => {
            tasks.forEach(t => t.completed = true); saveAndRender("Todas concluídas!");
        });
        document.getElementById('btnClearAll').addEventListener('click', () => {
            if(confirm('Excluir TODAS as suas tarefas?')) { tasks = []; saveAndRender("Tarefas excluídas."); }
        });

        // Calendário navegação
        document.getElementById('prevMonth').addEventListener('click', () => { currentDateObj.setMonth(currentDateObj.getMonth() - 1); renderCalendar(); });
        document.getElementById('nextMonth').addEventListener('click', () => { currentDateObj.setMonth(currentDateObj.getMonth() + 1); renderCalendar(); });
    }

    function applyTheme() {
        if (localStorage.getItem('taskMasterTheme') === 'dark') document.body.classList.add('dark-mode');
    }

    // === DADOS E RENDERIZAÇÃO ===
    function saveAndRender(msg = "") {
        // Salva com a chave exclusiva do usuário atual
        localStorage.setItem(`taskMasterData_${currentUser}`, JSON.stringify(tasks));
        if (msg) showToast(msg);
        updateDisplay();
    }

    function updateDisplay() {
        renderDashboard();
        renderTasks();
        if (document.getElementById('calendar').classList.contains('active')) renderCalendar();
    }

    function handleTaskSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('taskId').value;
        const newTask = {
            id: id || Date.now().toString(),
            title: document.getElementById('taskTitle').value,
            category: document.getElementById('taskCategory').value || 'Geral',
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDate').value,
            dueTime: document.getElementById('taskTime').value || '23:59',
            desc: document.getElementById('taskDesc').value,
            completed: id ? tasks.find(t => t.id === id).completed : false,
            createdAt: id ? tasks.find(t => t.id === id).createdAt : new Date().toISOString()
        };

        if (id) {
            tasks = tasks.map(t => t.id === id ? newTask : t); showToast('Atualizada!');
        } else {
            tasks.push(newTask); showToast('Criada com sucesso!');
        }
        closeModal(); saveAndRender();
    }

    window.deleteTask = function(id) { if(confirm('Excluir?')) { tasks = tasks.filter(t => t.id !== id); saveAndRender("Excluída."); } }
    window.editTask = function(id) {
        const t = tasks.find(x => x.id === id); if(!t) return;
        document.getElementById('taskId').value = t.id; document.getElementById('taskTitle').value = t.title;
        document.getElementById('taskCategory').value = t.category; document.getElementById('taskPriority').value = t.priority;
        document.getElementById('taskDate').value = t.dueDate; document.getElementById('taskTime').value = t.dueTime;
        document.getElementById('taskDesc').value = t.desc;
        document.getElementById('modalTitle').innerText = 'Editar Tarefa'; openModal();
    }
    window.toggleComplete = function(id) { const t = tasks.find(x => x.id === id); t.completed = !t.completed; saveAndRender(); }

    function getTaskStatus(task) {
        if (task.completed) return 'completed';
        const diffHours = (new Date(`${task.dueDate}T${task.dueTime}`) - new Date()) / (1000 * 60 * 60);
        if (diffHours < 0) return 'overdue';
        if (diffHours <= 24) return 'warning';
        return 'ontime';
    }

    function checkUpcomingDeadlines() {
        tasks.forEach(t => {
            if (!t.completed) {
                const s = getTaskStatus(t);
                if (s === 'warning') showToast(`"${t.title}" vence em breve.`);
                if (s === 'overdue') showToast(`"${t.title}" venceu!`);
            }
        });
    }

    function renderDashboard() {
        const total = tasks.length; const completed = tasks.filter(t => t.completed).length;
        const todayStr = new Date().toISOString().split('T')[0];
        let overdue = 0, today = 0;
        
        tasks.forEach(t => { if(!t.completed && getTaskStatus(t) === 'overdue') overdue++; if(t.dueDate === todayStr) today++; });
        
        document.getElementById('statTotal').innerText = total; document.getElementById('statCompleted').innerText = completed;
        document.getElementById('statPending').innerText = total - completed; document.getElementById('statOverdue').innerText = overdue;
        document.getElementById('statToday').innerText = today;

        const perc = total === 0 ? 0 : Math.round((completed / total) * 100);
        document.getElementById('generalProgress').style.width = `${perc}%`;
        document.getElementById('progressText').innerText = `${perc}% concluído`;
        document.getElementById('currentDateDisplay').innerText = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    function renderTasks() {
        const container = document.getElementById('tasksContainer'); container.innerHTML = '';
        const filter = document.getElementById('filterSelect').value, sort = document.getElementById('sortSelect').value;
        const query = document.getElementById('searchInput').value.toLowerCase(), todayStr = new Date().toISOString().split('T')[0];

        let filtered = tasks.filter(t => {
            if (query && !t.title.toLowerCase().includes(query) && !t.desc.toLowerCase().includes(query)) return false;
            if (filter === 'today') return t.dueDate === todayStr; if (filter === 'pending') return !t.completed;
            if (filter === 'completed') return t.completed; if (filter === 'overdue') return !t.completed && getTaskStatus(t) === 'overdue';
            if (filter === 'high') return t.priority === 'Alta' || t.priority === 'Urgente'; return true;
        });

        filtered.sort((a, b) => {
            if (sort === 'date-asc') return new Date(a.dueDate) - new Date(b.dueDate);
            if (sort === 'date-desc') return new Date(b.dueDate) - new Date(a.dueDate);
            if (sort === 'priority') { const p = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 }; return p[b.priority] - p[a.priority]; }
            return 0;
        });

        filtered.forEach(t => {
            const card = document.createElement('div'); card.className = `task-card status-${getTaskStatus(t)}`;
            card.innerHTML = `
                <div class="task-header"><span class="task-title" style="${t.completed?'text-decoration:line-through':''}">${t.title}</span><span class="task-badge">${t.priority}</span></div>
                <div class="task-desc">${t.desc || 'Sem descrição'}</div>
                <div class="task-footer"><span>📅 ${t.dueDate.split('-').reverse().join('/')}</span><span>📂 ${t.category}</span></div>
                <div class="task-actions">
                    <button class="${t.completed ? 'btn-secondary' : 'btn-primary'}" onclick="toggleComplete('${t.id}')">${t.completed ? 'Desfazer' : 'Concluir'}</button>
                    <button class="btn-secondary" onclick="editTask('${t.id}')">Editar</button>
                    <button class="btn-danger" onclick="deleteTask('${t.id}')">Excluir</button>
                </div>`;
            container.appendChild(card);
        });
        if (filtered.length === 0) container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">Nenhuma tarefa encontrada.</p>';
    }

    function renderCalendar() {
        const year = currentDateObj.getFullYear(), month = currentDateObj.getMonth();
        const calContainer = document.getElementById('calendarDays'); calContainer.innerHTML = '';
        document.getElementById('monthDisplay').innerText = `${["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 0; i < firstDay; i++) calContainer.innerHTML += `<div class="cal-day empty"></div>`;
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayTasks = tasks.filter(t => t.dueDate === dateStr);
            const dots = dayTasks.map(t => `<span class="cal-task-dot dot-${getTaskStatus(t)}"></span>`).join('');
            
            const div = document.createElement('div'); div.className = `cal-day ${dateStr === todayStr ? 'today' : ''}`;
            div.innerHTML = `<span class="day-number">${i}</span><div style="display:flex;gap:2px;flex-wrap:wrap;justify-content:center">${dots}</div>`;
            div.addEventListener('click', () => { document.getElementById('taskDate').value = dateStr; openModal(); });
            calContainer.appendChild(div);
        }
    }

    function openModal() { document.getElementById('taskModal').classList.add('active'); if(!document.getElementById('taskId').value) { document.getElementById('taskForm').reset(); document.getElementById('taskDate').value = new Date().toISOString().split('T')[0]; } }
    function closeModal() { document.getElementById('taskModal').classList.remove('active'); setTimeout(() => { document.getElementById('taskForm').reset(); document.getElementById('taskId').value = ''; }, 300); }
    function showToast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.innerText = msg; document.getElementById('toastContainer').appendChild(t); setTimeout(() => t.remove(), 3500); }
});

