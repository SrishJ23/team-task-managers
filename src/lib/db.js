// ============================================================
// Client-side "database" using localStorage
// Replaces the SQLite + Express backend entirely so the app
// can be deployed as a pure static site on Vercel.
// ============================================================

const KEYS = {
  users: 'ttm_users',
  projects: 'ttm_projects',
  tasks: 'ttm_tasks',
  seq: 'ttm_seq',
};

const JWT_SECRET = 'ttm_jwt_secret_v1';

// ---------- helpers ----------

function getAll(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function saveAll(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function nextId(entity) {
  const seqs = JSON.parse(localStorage.getItem(KEYS.seq) || '{}');
  seqs[entity] = (seqs[entity] || 0) + 1;
  localStorage.setItem(KEYS.seq, JSON.stringify(seqs));
  return seqs[entity];
}

// Simple hash using btoa + salt (good enough for a demo/local app)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + JWT_SECRET);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
  const computed = await hashPassword(password);
  return computed === hash;
}

// Tiny JWT-like token (base64 encoded JSON payload, signed with HMAC-SHA256)
async function signToken(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${body}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${header}.${body}.${sigB64}`;
}

async function verifyToken(token) {
  try {
    const [header, body, sigB64] = token.split('.');
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(`${header}.${body}`));
    if (!valid) return null;
    return JSON.parse(atob(body));
  } catch {
    return null;
  }
}

// ---------- seed default data on first run ----------

function seedIfEmpty() {
  const users = getAll(KEYS.users);
  if (users.length > 0) return;

  // Seed admin user (password: admin123)
  hashPassword('admin123').then(hash => {
    const adminId = nextId('users');
    const users = getAll(KEYS.users);
    users.push({
      id: adminId,
      name: 'Admin User',
      email: 'admin@demo.com',
      password: hash,
      role: 'Admin',
      createdAt: new Date().toISOString(),
    });
    saveAll(KEYS.users, users);

    // Seed a member
    hashPassword('member123').then(h2 => {
      const memberId = nextId('users');
      const us2 = getAll(KEYS.users);
      us2.push({
        id: memberId,
        name: 'Jane Member',
        email: 'member@demo.com',
        password: h2,
        role: 'Member',
        createdAt: new Date().toISOString(),
      });
      saveAll(KEYS.users, us2);

      // Seed projects
      const p1Id = nextId('projects');
      const p2Id = nextId('projects');
      const projects = [
        { id: p1Id, name: 'Website Redesign', description: 'Overhaul the company website with modern design', createdAt: new Date().toISOString() },
        { id: p2Id, name: 'Mobile App', description: 'Build the iOS/Android companion app', createdAt: new Date().toISOString() },
      ];
      saveAll(KEYS.projects, projects);

      // Seed tasks
      const now = new Date();
      const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      const tasks = [
        { id: nextId('tasks'), title: 'Design landing page', description: 'Create mockups for homepage', status: 'Completed', projectId: p1Id, assignedTo: adminId, dueDate: yesterday.toISOString(), createdBy: adminId, createdAt: new Date().toISOString() },
        { id: nextId('tasks'), title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions', status: 'In Progress', projectId: p1Id, assignedTo: memberId, dueDate: tomorrow.toISOString(), createdBy: adminId, createdAt: new Date().toISOString() },
        { id: nextId('tasks'), title: 'Write unit tests', description: 'Achieve 80% coverage', status: 'Pending', projectId: p2Id, assignedTo: memberId, dueDate: tomorrow.toISOString(), createdBy: adminId, createdAt: new Date().toISOString() },
        { id: nextId('tasks'), title: 'API integration', description: 'Connect frontend to REST APIs', status: 'Pending', projectId: p2Id, assignedTo: adminId, dueDate: yesterday.toISOString(), createdBy: adminId, createdAt: new Date().toISOString() },
      ];
      saveAll(KEYS.tasks, tasks);
    });
  });
}

seedIfEmpty();

// ============================================================
// Auth API
// ============================================================

export async function apiRegister(name, email, password, role) {
  const users = getAll(KEYS.users);
  if (users.find(u => u.email === email)) {
    throw { response: { data: { message: 'Email already exists' } } };
  }
  const hash = await hashPassword(password);
  const assignedRole = role === 'Admin' ? 'Admin' : 'Member';
  const user = { id: nextId('users'), name, email, password: hash, role: assignedRole, createdAt: new Date().toISOString() };
  users.push(user);
  saveAll(KEYS.users, users);
  return { message: 'User registered successfully' };
}

export async function apiLogin(email, password) {
  const users = getAll(KEYS.users);
  const user = users.find(u => u.email === email);
  if (!user) throw { response: { data: { message: 'Invalid credentials' } } };
  const valid = await verifyPassword(password, user.password);
  if (!valid) throw { response: { data: { message: 'Invalid credentials' } } };
  const token = await signToken({ id: user.id, role: user.role, name: user.name, exp: Date.now() + 86400000 });
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export async function getTokenUser(token) {
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.exp < Date.now()) return null;
  return payload;
}

// ============================================================
// Users API
// ============================================================

export function apiGetUsers() {
  const users = getAll(KEYS.users);
  return users.map(({ id, name, email, role }) => ({ id, name, email, role }));
}

// ============================================================
// Projects API
// ============================================================

export function apiGetProjects() {
  return getAll(KEYS.projects);
}

export function apiCreateProject(name, description, userRole) {
  if (userRole !== 'Admin') throw { response: { data: { message: 'Admin access required' } } };
  const projects = getAll(KEYS.projects);
  const project = { id: nextId('projects'), name, description, createdAt: new Date().toISOString() };
  projects.push(project);
  saveAll(KEYS.projects, projects);
  return project;
}

// ============================================================
// Tasks API
// ============================================================

function enrichTask(task) {
  const projects = getAll(KEYS.projects);
  const users = getAll(KEYS.users);
  const project = projects.find(p => p.id === task.projectId);
  const assignedUser = users.find(u => u.id === task.assignedTo);
  return {
    ...task,
    projectName: project?.name || null,
    assignedUserName: assignedUser?.name || null,
  };
}

export function apiGetTasks(currentUser) {
  const tasks = getAll(KEYS.tasks);
  const filtered = currentUser.role === 'Admin' ? tasks : tasks.filter(t => t.assignedTo === currentUser.id);
  return filtered.map(enrichTask);
}

export function apiCreateTask({ title, description, projectId, assignedTo, dueDate }, currentUser) {
  const tasks = getAll(KEYS.tasks);
  if (tasks.length >= 100) throw { response: { data: { message: 'Maximum limit of 100 tasks reached.' } } };
  const effectiveAssignedTo = currentUser.role === 'Admin' && assignedTo ? Number(assignedTo) : currentUser.id;
  const task = {
    id: nextId('tasks'),
    title,
    description,
    status: 'Pending',
    projectId: projectId ? Number(projectId) : null,
    assignedTo: effectiveAssignedTo,
    dueDate: dueDate || null,
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  saveAll(KEYS.tasks, tasks);
  return enrichTask(task);
}

export function apiUpdateTaskStatus(taskId, status, currentUser) {
  const tasks = getAll(KEYS.tasks);
  const idx = tasks.findIndex(t => t.id === Number(taskId));
  if (idx === -1) throw { response: { data: { message: 'Task not found' } } };
  const task = tasks[idx];
  if (currentUser.role !== 'Admin' && task.assignedTo !== currentUser.id) {
    throw { response: { data: { message: 'Forbidden' } } };
  }
  tasks[idx] = { ...task, status };
  saveAll(KEYS.tasks, tasks);
  return tasks[idx];
}

export function apiDeleteTask(taskId, currentUser) {
  const tasks = getAll(KEYS.tasks);
  const idx = tasks.findIndex(t => t.id === Number(taskId));
  if (idx === -1) throw { response: { data: { message: 'Task not found' } } };
  const task = tasks[idx];
  if (currentUser.role !== 'Admin' && task.assignedTo !== currentUser.id && task.createdBy !== currentUser.id) {
    throw { response: { data: { message: 'Forbidden' } } };
  }
  tasks.splice(idx, 1);
  saveAll(KEYS.tasks, tasks);
  return { message: 'Task deleted successfully' };
}

// ============================================================
// Dashboard API
// ============================================================

export function apiGetDashboard(currentUser) {
  const allTasks = getAll(KEYS.tasks);
  const tasks = currentUser.role === 'Admin' ? allTasks : allTasks.filter(t => t.assignedTo === currentUser.id);
  const today = new Date().toISOString();
  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'Pending').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    overdue: tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'Completed').length,
  };
}
