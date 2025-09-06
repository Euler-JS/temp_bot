// admin_users_manager.js - Gestão de Usuários Administrativos
class AdminUsersManager {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.currentUser = null;
        this.token = this.getToken();
    }

    getToken() {
        return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    // ===============================================
    // INICIALIZAÇÃO
    // ===============================================

    async init() {
        await this.loadCurrentUser();
        await this.loadAdminUsers();
        this.setupEventListeners();
    }

    async loadCurrentUser() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/auth/me`, {
                headers: this.getHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                this.currentUser = result.data;
                // Atualiza variável global e dispara evento
                this.updateGlobalCurrentUser();
            }
        } catch (error) {
            console.error('Erro ao carregar usuário atual:', error);
        }
    }

    setupEventListeners() {
        // Botões da interface
        document.getElementById('btnNewUser')?.addEventListener('click', () => this.showCreateUserModal());
        document.getElementById('userSearchInput')?.addEventListener('input', (e) => this.filterUsers(e.target.value));
        document.getElementById('roleFilter')?.addEventListener('change', (e) => this.filterByRole(e.target.value));

        // Forms
        document.getElementById('createUserForm')?.addEventListener('submit', (e) => this.handleCreateUser(e));
        document.getElementById('editUserForm')?.addEventListener('submit', (e) => this.handleEditUser(e));

        // Modal events
        document.getElementById('createUserModal')?.addEventListener('hidden.bs.modal', () => this.resetCreateForm());
        document.getElementById('editUserModal')?.addEventListener('hidden.bs.modal', () => this.resetEditForm());
    }

    // ===============================================
    // CARREGAMENTO DE DADOS
    // ===============================================

    async loadAdminUsers() {
        try {
            console.log('🔄 Carregando usuários administrativos...');

            const container = document.getElementById('adminUsersTable');
            if (!container) {
                console.error('❌ Container adminUsersTable não encontrado');
                return;
            }

            container.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">Carregando...</span>
                        </div>
                    </td>
                </tr>
            `;

            console.log('📡 Fazendo requisição para:', `${this.baseUrl}/admin/auth/users`);
            console.log('🔑 Headers:', this.getHeaders());

            const response = await fetch(`${this.baseUrl}/admin/auth/users`, {
                headers: this.getHeaders()
            });

            console.log('📥 Resposta recebida:', response.status, response.statusText);

            const result = await response.json();
            console.log('📦 Dados recebidos:', result);

            if (result.success) {
                this.renderAdminUsers(result.data);
                this.updateUsersStats(result.data);
            } else {
                this.showError('Erro ao carregar usuários administrativos');
            }

        } catch (error) {
            console.error('Erro ao carregar usuários admin:', error);
            this.showError('Erro de conexão');
        }
    }

    renderAdminUsers(users) {
        const tbody = document.getElementById('adminUsersTable');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        Nenhum usuário administrativo encontrado
                    </td>
                </tr>
            `;
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-circle me-3">
                            ${user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong>${user.full_name}</strong>
                            <br>
                            <small class="text-muted">@${user.username}</small>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${this.getRoleBadgeClass(user.role)}">
                        ${this.translateRole(user.role)}
                    </span>
                </td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(user.status)}">
                        ${this.translateStatus(user.status)}
                    </span>
                </td>
                <td>
                    <small class="text-muted">
                        ${user.last_login ? this.formatDate(user.last_login) : 'Nunca'}
                    </small>
                </td>
                <td>
                    <small class="text-muted">
                        ${this.formatDate(user.created_at)}
                    </small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="window.adminUsersManager && window.adminUsersManager.viewUser('${user.id}')" title="Ver detalhes">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="window.adminUsersManager && window.adminUsersManager.editUser('${user.id}')" title="Editar" 
                                ${!this.canManageUser(user) ? 'disabled' : ''}>
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="window.adminUsersManager && window.adminUsersManager.deleteUser('${user.id}')" title="Deletar"
                                ${!this.canDeleteUser(user) ? 'disabled' : ''}>
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Armazenar dados para filtros
        this.allUsers = users;
    }

    updateUsersStats(users) {
        const stats = {
            total: users.length,
            active: users.filter(u => u.status === 'active').length,
            admins: users.filter(u => u.role === 'admin').length,
            moderators: users.filter(u => u.role === 'moderator').length
        };

        console.log("📊 Stats calculadas:", stats);

        // Atualizar elementos só se existirem
        const totalElement = document.getElementById('totalAdmins');
        const activeElement = document.getElementById('activeAdmins');
        const adminElement = document.getElementById('adminCount');
        const moderatorElement = document.getElementById('moderatorCount');

        if (totalElement) totalElement.textContent = stats.total || 0;
        if (activeElement) activeElement.textContent = stats.active || 0;
        if (adminElement) adminElement.textContent = stats.admins || 0;
        if (moderatorElement) moderatorElement.textContent = stats.moderators || 0;
    }

    // ===============================================
    // CRIAÇÃO DE USUÁRIO
    // ===============================================

    showCreateUserModal() {
        if (!this.currentUser?.permissions?.manage_admins) {
            this.showError('Você não tem permissão para criar usuários administrativos');
            return;
        }

        const modal = new bootstrap.Modal(document.getElementById('createUserModal'));
        modal.show();
    }

    async handleCreateUser(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            full_name: formData.get('full_name'),
            role: formData.get('role')
        };

        // Validações
        if (userData.password !== formData.get('confirmPassword')) {
            this.showError('As senhas não coincidem');
            return;
        }

        if (userData.password.length < 6) {
            this.showError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        try {
            this.setFormLoading('createUserForm', true);

            const response = await fetch(`${this.baseUrl}/admin/auth/users`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Usuário criado com sucesso!');
                this.hideModal('createUserModal');
                await this.loadAdminUsers();
            } else {
                this.showError(result.error || 'Erro ao criar usuário');
            }

        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            this.showError('Erro de conexão');
        } finally {
            this.setFormLoading('createUserForm', false);
        }
    }

    // ===============================================
    // EDIÇÃO DE USUÁRIO
    // ===============================================

    async editUser(userId) {
        console.log("**** Verificando permissão para editar usuários:", this.currentUser, userId);
        if (!this.canManageUsers()) {
            this.showError('Você não tem permissão para editar usuários');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/admin/auth/users/${userId}`, {
                headers: this.getHeaders()
            });

            const result = await response.json();

            if (result.success) {
                this.populateEditForm(result.data);
                const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
                modal.show();
            } else {
                this.showError('Erro ao carregar dados do usuário');
            }

        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            this.showError('Erro de conexão');
        }
    }

    populateEditForm(user) {
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUsername').value = user.username;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editFullName').value = user.full_name;
        document.getElementById('editRole').value = user.role;
        document.getElementById('editStatus').value = user.status;

        // Marcar permissões
        Object.keys(user.permissions).forEach(permission => {
            const checkbox = document.getElementById(`editPerm_${permission}`);
            if (checkbox) {
                checkbox.checked = user.permissions[permission];
            }
        });
    }

    async handleEditUser(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const userId = formData.get('userId');

        const updateData = {
            username: formData.get('username'),
            email: formData.get('email'),
            full_name: formData.get('full_name'),
            role: formData.get('role'),
            status: formData.get('status')
        };

        // Incluir nova senha se fornecida
        const newPassword = formData.get('newPassword');
        if (newPassword) {
            if (newPassword !== formData.get('confirmNewPassword')) {
                this.showError('As senhas não coincidem');
                return;
            }
            updateData.password = newPassword;
        }

        // Coletar permissões
        const permissions = {};
        const permissionCheckboxes = e.target.querySelectorAll('input[name="permissions"]');
        permissionCheckboxes.forEach(checkbox => {
            permissions[checkbox.value] = checkbox.checked;
        });
        updateData.permissions = permissions;

        try {
            this.setFormLoading('editUserForm', true);

            const response = await fetch(`${this.baseUrl}/admin/auth/users/${userId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updateData)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Usuário atualizado com sucesso!');
                this.hideModal('editUserModal');
                // Se o usuário editado é o usuário atual, recarrega dados para refletir mudanças globais
                if (this.currentUser && this.currentUser.id === userId) {
                    await this.loadCurrentUser();
                }
                await this.loadAdminUsers();
            } else {
                this.showError(result.error || 'Erro ao atualizar usuário');
            }

        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            this.showError('Erro de conexão');
        } finally {
            this.setFormLoading('editUserForm', false);
        }
    }

    // ===============================================
    // VISUALIZAÇÃO E EXCLUSÃO
    // ===============================================

    async viewUser(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/admin/auth/users/${userId}`, {
                headers: this.getHeaders()
            });

            const result = await response.json();

            if (result.success) {
                this.showUserDetails(result.data);
            } else {
                this.showError('Erro ao carregar detalhes do usuário');
            }

        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            this.showError('Erro de conexão');
        }
    }

    showUserDetails(user) {
        // Implementar modal de detalhes
        const detailsHtml = `
            <div class="modal fade" id="userDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Detalhes do Usuário</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Informações Básicas</h6>
                                    <p><strong>Nome:</strong> ${user.full_name}</p>
                                    <p><strong>Usuário:</strong> @${user.username}</p>
                                    <p><strong>Email:</strong> ${user.email}</p>
                                    <p><strong>Função:</strong> ${this.translateRole(user.role)}</p>
                                    <p><strong>Status:</strong> ${this.translateStatus(user.status)}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Atividade</h6>
                                    <p><strong>Último Login:</strong> ${user.last_login ? this.formatDate(user.last_login) : 'Nunca'}</p>
                                    <p><strong>Criado em:</strong> ${this.formatDate(user.created_at)}</p>
                                    <p><strong>Atualizado em:</strong> ${this.formatDate(user.updated_at)}</p>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-12">
                                    <h6>Permissões</h6>
                                    <div class="row">
                                        ${Object.entries(user.permissions).map(([perm, value]) => `
                                            <div class="col-md-4">
                                                <span class="badge ${value ? 'bg-success' : 'bg-secondary'} me-2">
                                                    <i class="bi ${value ? 'bi-check' : 'bi-x'}"></i>
                                                </span>
                                                ${this.translatePermission(perm)}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior se existir
        document.getElementById('userDetailsModal')?.remove();

        // Inserir novo modal
        document.body.insertAdjacentHTML('beforeend', detailsHtml);

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
        modal.show();
    }

    async deleteUser(userId) {
        if (!this.canDeleteUser({ id: userId })) {
            this.showError('Você não pode deletar este usuário');
            return;
        }

        const confirmed = confirm('Tem certeza que deseja deletar este usuário administrativo? Esta ação não pode ser desfeita.');
        if (!confirmed) return;

        try {
            const response = await fetch(`${this.baseUrl}/admin/auth/users/${userId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Usuário deletado com sucesso!');
                await this.loadAdminUsers();
            } else {
                this.showError(result.error || 'Erro ao deletar usuário');
            }

        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            this.showError('Erro de conexão');
        }
    }

    // ===============================================
    // FILTROS E BUSCA
    // ===============================================

    filterUsers(searchTerm) {
        const rows = document.querySelectorAll('#adminUsersTable tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const isVisible = text.includes(searchTerm.toLowerCase());
            row.style.display = isVisible ? '' : 'none';
        });
    }

    filterByRole(role) {
        const rows = document.querySelectorAll('#adminUsersTable tr');

        rows.forEach(row => {
            if (role === 'all') {
                row.style.display = '';
                return;
            }

            const roleElement = row.querySelector('.badge');
            if (roleElement) {
                const userRole = this.getRoleFromBadge(roleElement.textContent);
                row.style.display = userRole === role ? '' : 'none';
            }
        });
    }

    // ===============================================
    // UTILITÁRIOS
    // ===============================================

    canManageUsers() {
        console.log("🔍 Verificando permissão para gerenciar usuários:", this.currentUser);
        console.log(this.currentUser?.permissions?.manage_admins === true, this.currentUser?.permissions?.manage_admins == true)
        return window.currentAdminUser?.permissions?.manage_admins === true;
    }

    canManageUser(user) {
        if (!this.canManageUsers()) return false;
        if (user.id === window.currentAdminUser?.id) return true; // Pode editar a si mesmo
        if (window.currentAdminUser?.role === 'super_admin') return true;
        return false;
    }

    canDeleteUser(user) {
        if (!this.canManageUsers()) return false;
        if (user.id === window.currentAdminUser?.id) return false; // Não pode deletar a si mesmo
        if (window.currentAdminUser?.role === 'super_admin') return true;
        return false;
    }

    getRoleBadgeClass(role) {
        const classes = {
            'super_admin': 'bg-danger',
            'admin': 'bg-primary',
            'moderator': 'bg-warning'
        };
        return classes[role] || 'bg-secondary';
    }

    getStatusBadgeClass(status) {
        const classes = {
            'active': 'bg-success',
            'inactive': 'bg-secondary',
            'suspended': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    translateRole(role) {
        const translations = {
            'super_admin': 'Super Admin',
            'admin': 'Administrador',
            'moderator': 'Moderador'
        };
        return translations[role] || role;
    }

    translateStatus(status) {
        const translations = {
            'active': 'Ativo',
            'inactive': 'Inativo',
            'suspended': 'Suspenso'
        };
        return translations[status] || status;
    }

    translatePermission(permission) {
        const translations = {
            'view_users': 'Ver Usuários',
            'manage_users': 'Gerenciar Usuários',
            'send_alerts': 'Enviar Alertas',
            'view_analytics': 'Ver Analytics',
            'manage_settings': 'Gerenciar Configurações',
            'view_logs': 'Ver Logs',
            'manage_admins': 'Gerenciar Admins'
        };
        return translations[permission] || permission;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-BR');
    }

    // ===============================================
    // CURRENT USER GLOBAL
    // ===============================================

    updateGlobalCurrentUser() {
        window.currentAdminUser = this.currentUser;
        // Função helper global simples
        if (!window.getCurrentAdminUser) {
            window.getCurrentAdminUser = () => window.currentAdminUser;
        }
        // Dispara evento para outros scripts ouvirem
        document.dispatchEvent(new CustomEvent('admin:current-user-updated', { detail: this.currentUser }));
    }

    // UI Helpers
    setFormLoading(formId, loading) {
        const form = document.getElementById(formId);
        const submitBtn = form.querySelector('button[type="submit"]');

        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processando...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Salvar';
        }
    }

    hideModal(modalId) {
        const modalElement = document.getElementById(modalId);
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
    }

    resetCreateForm() {
        document.getElementById('createUserForm')?.reset();
    }

    resetEditForm() {
        document.getElementById('editUserForm')?.reset();
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showNotification(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alert);

        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }
}

// Tornar AdminUsersManager disponível globalmente
window.AdminUsersManager = AdminUsersManager;

// Instância global
let adminUsersManager;

// Fallback imediato para garantir que a variável exista antes de qualquer clique rápido
if (!window.adminUsersManager) {
    window.adminUsersManager = new AdminUsersManager(window.ADMIN_API_BASE_URL || '');
}

// Inicialização automática quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Evita recriar caso já exista (por exemplo, em hot reload)
    if (!window.adminUsersManager) {
        // Detecta base URL: pode ser configurada globalmente via window.ADMIN_API_BASE_URL
        const detectedBaseUrl = window.ADMIN_API_BASE_URL || '';
        window.adminUsersManager = new AdminUsersManager(detectedBaseUrl);
    }
    adminUsersManager = window.adminUsersManager;
    // Garante que init só é chamado uma vez
    if (!adminUsersManager._initialized) {
        adminUsersManager.init();
        adminUsersManager._initialized = true;
    }
});
