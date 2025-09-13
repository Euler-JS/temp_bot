// admin.js - Painel de Administração TempBot
class AdminDashboard {
    constructor() {
        this.baseUrl = window.location.origin;
        this.charts = {};
        this.data = {};
        this.init();
    }

    async init() {
        await this.loadInitialData();
        this.setupEventListeners();
        this.updateLastRefresh();

        // Atualizar automaticamente a cada 5 minutos
        setInterval(() => this.refreshData(), 5 * 60 * 1000);
    }

    setupEventListeners() {
        // Busca de usuários
        document.getElementById('userSearch')?.addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });

        // Formulário de configurações
        document.getElementById('botSettings')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Sistema de alertas
        document.getElementById('alertForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendAlert();
        });

        // Contador de caracteres para mensagem de alerta
        document.getElementById('alertMessage')?.addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.getElementById('charCount').textContent = count;
        });

        // Atualizar contagem de usuários quando região muda
        document.getElementById('alertRegion')?.addEventListener('change', (e) => {
            this.updateUserCountForRegion(e.target.value);
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadStats(),
                this.loadUsers(),
                this.loadAnalytics(),
                this.loadSystemStatus(),
                this.loadAlertsData()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.showError('Erro ao carregar dados do dashboard');
        }
    }

    async loadStats() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/stats`);
            const stats = await response.json();

            if (stats.success) {
                this.data.stats = stats.data;
                this.updateStatsCards(stats.data);
                this.createDailyQueriesChart(stats.data.dailyQueries || []);
                this.createCitiesChart(stats.data.topCities || []);
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    async loadUsers() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/users`);
            const users = await response.json();

            if (users.success) {
                this.data.users = users.data;
                this.updateUsersTable(users.data);
                this.updateRecentActivity(users.data);
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    }

    async loadAnalytics() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/analytics`);
            const analytics = await response.json();

            if (analytics.success) {
                this.data.analytics = analytics.data;
                this.createExpertiseChart(analytics.data.expertiseDistribution || {});
                this.createGrowthChart(analytics.data.growthData || []);
                this.updateDetailedMetrics(analytics.data);
                this.createCityQueriesChart(analytics.data.cityQueries || {});
            }
        } catch (error) {
            console.error('Erro ao carregar analytics:', error);
        }
    }

    async loadSystemStatus() {
        console.log('🔧 Carregando status do sistema...');
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            console.log('🔧 Resposta do health check:', response.status);

            if (!response.ok) {
                console.error('❌ Erro na resposta do health check:', response.status);
                return;
            }

            const status = await response.json();
            console.log('🔧 Status recebido:', status);

            this.updateSystemStatus(status);
            this.updateServicesStatus(status.services || {});
        } catch (error) {
            console.error('❌ Erro ao carregar status do sistema:', error);
            // Mostrar erro na interface
            const container = document.getElementById('servicesStatus');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Erro ao carregar status dos serviços
                    </div>
                `;
            }
        }
    }

    async loadAlertsData() {
        console.log('📊 Carregando dados de alertas...');
        try {
            // Carregar usuários por região
            console.log('👥 Buscando usuários por região...');
            const usersResponse = await fetch(`${this.baseUrl}/admin/users-by-region`);

            if (!usersResponse.ok) {
                console.error('❌ Erro na resposta de usuários:', usersResponse.status);
                return;
            }

            const usersData = await usersResponse.json();
            console.log('👥 Resposta usuários:', usersData);

            if (usersData.success && usersData.data) {
                console.log('✅ Dados de usuários recebidos, atualizando interface...');
                this.updateUsersByRegion(usersData.data);
            } else {
                console.error('❌ Erro nos dados de usuários:', usersData);
            }

            // Carregar alertas recentes
            console.log('📢 Buscando alertas recentes...');
            const alertsResponse = await fetch(`${this.baseUrl}/admin/recent-alerts`);

            if (!alertsResponse.ok) {
                console.error('❌ Erro na resposta de alertas:', alertsResponse.status);
                return;
            }

            const alertsData = await alertsResponse.json();
            console.log('📢 Resposta alertas:', alertsData);

            if (alertsData.success && alertsData.data) {
                console.log('✅ Dados de alertas recebidos, atualizando interface...');
                this.updateRecentAlerts(alertsData.data);
            } else {
                console.error('❌ Erro nos dados de alertas:', alertsData);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados de alertas:', error);
        }
    } updateStatsCards(stats) {
        document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('activeUsers').textContent = stats.activeUsers || 0;
        document.getElementById('totalQueries').textContent = stats.totalQueries || 0;
        document.getElementById('notificationUsers').textContent = stats.usersWithNotifications || 0;
    }

    updateUsersTable(users) {
        const tbody = document.getElementById('usersTable');
        if (!tbody) return;

        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong>${this.maskPhone(user.contact)}</strong>
                </td>
                <td>
                    ${user.preferred_city || user.last_city || '-'}
                </td>
                <td>
                    <span class="badge badge-custom expertise-${user.expertise_level}">
                        ${this.translateExpertise(user.expertise_level)}
                    </span>
                </td>
                <td>
                    <span class="badge bg-primary">${user.query_count || 0}</span>
                </td>
                <td>
                    ${this.formatDate(user.last_access)}
                </td>
                <td>
                    ${user.notifications ?
                    '<span class="badge bg-success">Ativo</span>' :
                    '<span class="badge bg-secondary">Inativo</span>'}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="admin.viewUser('${user.contact}')">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateRecentActivity(users) {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        const recentUsers = users
            .sort((a, b) => new Date(b.last_access) - new Date(a.last_access))
            .slice(0, 10);

        container.innerHTML = recentUsers.map(user => `
            <div class="d-flex align-items-center mb-2 p-2 border-start border-primary border-3">
                <div class="flex-grow-1">
                    <strong>${this.maskPhone(user.contact)}</strong>
                    <small class="text-muted d-block">
                        ${user.last_city || 'Cidade não definida'} • 
                        ${user.query_count || 0} consultas
                    </small>
                </div>
                <small class="text-muted">
                    ${this.timeAgo(user.last_access)}
                </small>
            </div>
        `).join('');
    }

    createDailyQueriesChart(data) {
        const ctx = document.getElementById('dailyQueriesChart');
        if (!ctx) return;

        if (this.charts.dailyQueries) {
            this.charts.dailyQueries.destroy();
        }

        const labels = data.map(d => this.formatDate(d.date, 'short'));
        const values = data.map(d => d.count);

        this.charts.dailyQueries = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Consultas',
                    data: values,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createCitiesChart(data) {
        const ctx = document.getElementById('citiesChart');
        if (!ctx) return;

        if (this.charts.cities) {
            this.charts.cities.destroy();
        }

        const labels = data.map(d => d.city);
        const values = data.map(d => d.count);
        const colors = [
            '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
            '#0891b2', '#c2410c', '#be185d', '#4338ca', '#0d9488'
        ];

        this.charts.cities = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createExpertiseChart(data) {
        const ctx = document.getElementById('expertiseChart');
        if (!ctx) return;

        if (this.charts.expertise) {
            this.charts.expertise.destroy();
        }

        const labels = Object.keys(data).map(key => this.translateExpertise(key));
        const values = Object.values(data);

        this.charts.expertise = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Usuários',
                    data: values,
                    backgroundColor: ['#dbeafe', '#fef3c7', '#dcfce7'],
                    borderColor: ['#1e40af', '#d97706', '#166534'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createGrowthChart(data) {
        const ctx = document.getElementById('growthChart');
        if (!ctx) return;

        if (this.charts.growth) {
            this.charts.growth.destroy();
        }

        const labels = data.map(d => this.formatDate(d.date, 'short'));
        const values = data.map(d => d.cumulative);

        this.charts.growth = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Usuários Acumulados',
                    data: values,
                    borderColor: '#059669',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createCityQueriesChart(data) {
        const ctx = document.getElementById('cityQueriesChart');
        if (!ctx) return;

        if (this.charts.cityQueries) {
            this.charts.cityQueries.destroy();
        }

        const labels = Object.keys(data);
        const values = Object.values(data);

        this.charts.cityQueries = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Consultas',
                    data: values,
                    backgroundColor: '#2563eb',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateDetailedMetrics(data) {
        const container = document.getElementById('detailedMetrics');
        if (!container) return;

        container.innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <div class="text-center p-3 border rounded">
                        <h4 class="text-primary">${data.averageQueriesPerUser || 0}</h4>
                        <p class="mb-0">Consultas por Usuário</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="text-center p-3 border rounded">
                        <h4 class="text-success">${data.retentionRate || 0}%</h4>
                        <p class="mb-0">Taxa de Retenção</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="text-center p-3 border rounded">
                        <h4 class="text-warning">${data.averageResponseTime || 0}s</h4>
                        <p class="mb-0">Tempo Resposta Médio</p>
                    </div>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Cidades Mais Populares:</h6>
                    <div class="d-flex flex-wrap gap-2">
                        ${(data.popularCities || []).map(city =>
            `<span class="badge bg-primary">${city.name} (${city.count})</span>`
        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    updateSystemStatus(status) {
        const container = document.getElementById('systemStatus');
        if (!container) return;

        const services = status.services || {};

        container.innerHTML = `
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <span>Database</span>
                    <span class="badge ${services.database === 'ok' ? 'bg-success' : 'bg-danger'}">
                        ${services.database === 'ok' ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <span>OpenAI</span>
                    <span class="badge ${services.openai === 'ok' ? 'bg-success' : 'bg-danger'}">
                        ${services.openai === 'ok' ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <span>WhatsApp</span>
                    <span class="badge ${services.whatsapp === 'configured' ? 'bg-success' : 'bg-warning'}">
                        ${services.whatsapp === 'configured' ? 'Configurado' : 'Não Configurado'}
                    </span>
                </div>
            </div>
            <hr>
            <small class="text-muted">
                Última verificação: ${this.formatDate(status.timestamp)}
            </small>
        `;
    }

    updateServicesStatus(services) {
        const container = document.getElementById('servicesStatus');
        if (!container) return;

        // Esta função agora é específica para serviços de CLIMA apenas
        this.updateWeatherServicesStatus(services);
    }

    updateWeatherServicesStatus(services) {
        const container = document.getElementById('servicesStatus');
        if (!container) return;

        if (!services || Object.keys(services).length === 0) {
            container.innerHTML = '<p class="text-muted small">Carregando status dos serviços de clima...</p>';
            return;
        }

        // Buscar dados específicos de clima
        this.loadWeatherServiceDetails().then(weatherData => {
            container.innerHTML = `
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-cloud-sun me-2"></i>Weather API</span>
                        <span class="badge ${weatherData.weatherApi ? 'bg-success' : 'bg-danger'}">
                            ${weatherData.weatherApi ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-thermometer me-2"></i>Consultas Hoje</span>
                        <span class="badge bg-info">
                            ${weatherData.todayQueries || 0}
                        </span>
                    </div>
                </div>
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-clock me-2"></i>Última Atualização</span>
                        <span class="badge bg-secondary">
                            ${weatherData.lastUpdate || 'N/A'}
                        </span>
                    </div>
                </div>
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-geo-alt me-2"></i>Cidades Ativas</span>
                        <span class="badge bg-primary">
                            ${weatherData.activeCities || 0}
                        </span>
                    </div>
                </div>
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-speedometer2 me-2"></i>Tempo Resposta</span>
                        <span class="badge ${weatherData.responseTime < 2000 ? 'bg-success' : 'bg-warning'}">
                            ${weatherData.responseTime || 'N/A'}ms
                        </span>
                    </div>
                </div>
            `;
        });
    }

    async loadWeatherServiceDetails() {
        try {
            // Buscar estatísticas específicas de clima
            const response = await fetch(`${this.baseUrl}/admin/weather-stats`);
            const data = await response.json();

            if (data.success) {
                return data.data;
            }
        } catch (error) {
            console.error('Erro ao carregar dados de clima:', error);
        }

        // Dados padrão se a API falhar
        return {
            weatherApi: true,
            todayQueries: 0,
            lastUpdate: 'Indisponível',
            activeCities: 0,
            responseTime: 'N/A'
        };
    }

    updateUsersByRegion(data) {
        console.log('👥 Atualizando usuários por região:', data);
        const container = document.getElementById('regionStats');
        if (!container) {
            console.error('❌ Elemento regionStats não encontrado');
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-muted small">Nenhum dados de região disponível</p>';
            return;
        }

        // Criar tabela para mostrar os usuários por região
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-borderless">
                    <thead>
                        <tr>
                            <th>Região</th>
                            <th>Total</th>
                            <th>Ativos</th>
                            <th>Médias</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(region => `
                            <tr>
                                <td><strong>${region.region}</strong></td>
                                <td><span class="badge bg-primary">${region.user_count || 0}</span></td>
                                <td><span class="badge bg-success">${region.active_users || 0}</span></td>
                                <td><span class="badge bg-info">${Math.round(region.avg_queries || 0)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    updateRecentAlerts(data) {
        console.log('📢 Atualizando alertas recentes:', data);
        const container = document.getElementById('recentAlerts');
        if (!container) {
            console.error('❌ Elemento recentAlerts não encontrado');
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-muted small">Nenhum alerta enviado recentemente</p>';
            return;
        }

        // Criar tabela para mostrar os alertas
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Título</th>
                            <th>Tipo</th>
                            <th>Região</th>
                            <th>Usuários</th>
                            <th>Status</th>
                            <th>Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(alert => `
                            <tr>
                                <td>
                                    <strong>${alert.title}</strong>
                                    <br>
                                    <small class="text-muted">${alert.message.substring(0, 50)}...</small>
                                </td>
                                <td>
                                    <span class="badge ${this.getAlertTypeBadge(alert.alert_type)}">
                                        ${this.translateAlertType(alert.alert_type)}
                                    </span>
                                </td>
                                <td>${alert.target_region}</td>
                                <td><span class="badge bg-primary">${alert.users_count || 0}</span></td>
                                <td>
                                    <span class="badge ${this.getStatusBadge(alert.delivery_status)}">
                                        ${this.translateStatus(alert.delivery_status)}
                                    </span>
                                </td>
                                <td>
                                    <small>${this.formatDate(alert.sent_at)}</small>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async refreshLogs() {
        try {
            const container = document.getElementById('logsContainer');
            if (!container) return;

            container.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

            const response = await fetch(`${this.baseUrl}/admin/logs`);
            const logs = await response.json();

            if (logs.success) {
                container.innerHTML = logs.data.map(log =>
                    `<div class="log-entry mb-2 p-2 border-start border-3 ${this.getLogColor(log.level)}">
                        <strong>[${this.formatDate(log.timestamp)}]</strong> 
                        <span class="badge bg-${this.getLogBadgeColor(log.level)}">${log.level}</span>
                        <br>
                        ${log.message}
                    </div>`
                ).join('');
            } else {
                container.innerHTML = '<p class="text-muted">Nenhum log disponível</p>';
            }
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
        }
    }

    // Utility functions
    maskPhone(phone) {
        if (!phone) return '-';
        return phone.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '+$1 $2 $3 $4');
    }

    translateExpertise(level) {
        const translations = {
            'basic': 'Básico',
            'intermediate': 'Intermediário',
            'advanced': 'Avançado'
        };
        return translations[level] || level;
    }

    formatDate(dateString, format = 'full') {
        if (!dateString) return '-';
        const date = new Date(dateString);

        if (format === 'short') {
            return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
        }

        return date.toLocaleString('pt-BR');
    }

    timeAgo(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    }

    getLogColor(level) {
        const colors = {
            'error': 'border-danger',
            'warn': 'border-warning',
            'info': 'border-primary',
            'debug': 'border-secondary'
        };
        return colors[level] || 'border-secondary';
    }

    getLogBadgeColor(level) {
        const colors = {
            'error': 'danger',
            'warn': 'warning',
            'info': 'primary',
            'debug': 'secondary'
        };
        return colors[level] || 'secondary';
    }

    getAlertTypeBadge(type) {
        const badges = {
            'urgente': 'bg-danger',
            'aviso': 'bg-warning',
            'informacao': 'bg-info',
            'meteorologico': 'bg-primary',
            'seguranca': 'bg-dark'
        };
        return badges[type] || 'bg-secondary';
    }

    translateAlertType(type) {
        const translations = {
            'urgente': 'Urgente',
            'aviso': 'Aviso',
            'informacao': 'Informação',
            'meteorologico': 'Meteorológico',
            'seguranca': 'Segurança'
        };
        return translations[type] || type;
    }

    getStatusBadge(status) {
        const badges = {
            'pending': 'bg-warning',
            'sending': 'bg-info',
            'completed': 'bg-success',
            'failed': 'bg-danger'
        };
        return badges[status] || 'bg-secondary';
    }

    translateStatus(status) {
        const translations = {
            'pending': 'Pendente',
            'sending': 'Enviando',
            'completed': 'Concluído',
            'failed': 'Falhou'
        };
        return translations[status] || status;
    }

    filterUsers(searchTerm) {
        const rows = document.querySelectorAll('#usersTable tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
        });
    }

    async exportUsers() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/users/export`);
            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `usuarios_tempbot_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao exportar usuários:', error);
            this.showError('Erro ao exportar usuários');
        }
    }

    async saveSettings() {
        try {
            const formData = new FormData(document.getElementById('botSettings'));
            const settings = Object.fromEntries(formData);

            const response = await fetch(`${this.baseUrl}/admin/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                this.showSuccess('Configurações salvas com sucesso!');
            } else {
                this.showError('Erro ao salvar configurações');
            }
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.showError('Erro ao salvar configurações');
        }
    }

    async viewUser(contact) {
        try {
            const response = await fetch(`${this.baseUrl}/admin/users/${contact}`);
            const user = await response.json();

            if (user.success) {
                // Implementar modal ou página de detalhes do usuário
                console.log('Detalhes do usuário:', user.data);
            }
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
        }
    }

    async refreshData() {
        await this.loadInitialData();
        this.updateLastRefresh();
        this.showSuccess('Dados atualizados!', 2000);
    }

    updateLastRefresh() {
        const element = document.getElementById('lastUpdate');
        if (element) {
            element.textContent = new Date().toLocaleTimeString('pt-BR');
        }
    }

    showSuccess(message, duration = 5000) {
        this.showNotification(message, 'success', duration);
    }

    showError(message, duration = 5000) {
        this.showNotification(message, 'danger', duration);
    }

    showNotification(message, type = 'info', duration = 5000) {
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
        }, duration);
    }

    // ===============================================
    // SISTEMA DE ALERTAS
    // ===============================================

    async loadRegionStats() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/region-stats`);
            const data = await response.json();

            if (data.success) {
                this.updateRegionStatsDisplay(data.data);
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas de região:', error);
        }
    }

    updateRegionStatsDisplay(stats) {
        const container = document.getElementById('regionStats');
        if (!container) return;

        container.innerHTML = Object.entries(stats)
            .map(([region, count]) => `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="text-capitalize">${region}</span>
                    <span class="badge bg-primary">${count} usuários</span>
                </div>
            `).join('');
    }

    async updateUserCountForRegion(region) {
        if (!region) return;

        try {
            const response = await fetch(`${this.baseUrl}/admin/region-users/${region}`);
            const data = await response.json();

            if (data.success) {
                const count = data.data.count;
                const previewElement = document.getElementById('previewUserCount');
                if (previewElement) {
                    previewElement.textContent = `${count} usuários`;
                }
            }
        } catch (error) {
            console.error('Erro ao obter contagem de usuários:', error);
        }
    }

    async previewAlert() {
        const region = document.getElementById('alertRegion').value;
        const type = document.getElementById('alertType').value;
        const title = document.getElementById('alertTitle').value;
        const message = document.getElementById('alertMessage').value;
        const includeWeather = document.getElementById('includeWeather').checked;

        if (!region || !type || !title || !message) {
            this.showError('Preencha todos os campos obrigatórios');
            return;
        }

        // Obter dados meteorológicos se solicitado
        let weatherData = '';
        if (includeWeather && region !== 'all') {
            try {
                const response = await fetch(`${this.baseUrl}/admin/weather/${region}`);
                const weather = await response.json();
                if (weather.success) {
                    weatherData = `\n\n🌤️ *Condições atuais em ${weather.data.city}:*\n🌡️ ${weather.data.temperature}°C\n💧 ${weather.data.humidity}% umidade\n☀️ ${weather.data.description}`;
                }
            } catch (error) {
                console.log('Erro ao obter dados meteorológicos:', error);
            }
        }

        // Construir preview da mensagem
        const typeIcons = {
            'urgente': '🚨',
            'aviso': '⚠️',
            'informacao': 'ℹ️',
            'meteorologico': '🌩️',
            'seguranca': '🛡️'
        };

        const previewContent = `
            ${typeIcons[type]} *${title}*

            ${message}${weatherData}

            ---
            _Alerta enviado pela Joana Bot - ${new Date().toLocaleString('pt-BR')}_
        `;

        document.getElementById('alertPreviewContent').innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${previewContent}</pre>`;
        document.getElementById('previewRegion').textContent = region === 'all' ? 'Todos os usuários' : region.charAt(0).toUpperCase() + region.slice(1);

        // Obter contagem de usuários
        await this.updateUserCountForRegion(region);

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('alertPreviewModal'));
        modal.show();
    }

    async sendAlert() {
        const region = document.getElementById('alertRegion').value;
        const type = document.getElementById('alertType').value;
        const title = document.getElementById('alertTitle').value;
        const message = document.getElementById('alertMessage').value;
        const includeWeather = document.getElementById('includeWeather').checked;
        const password = document.getElementById('alertPassword').value;

        // Validações
        if (!region || !type || !title || !message || !password) {
            this.showError('Preencha todos os campos obrigatórios');
            return;
        }

        if (password !== 'joana@bot') {
            this.showError('Senha incorreta. Verifique a senha de confirmação.');
            document.getElementById('alertPassword').value = '';
            return;
        }

        // Confirmação final
        const confirmMessage = `Tem certeza que deseja enviar este alerta para ${region === 'all' ? 'todos os usuários' : 'usuários de ' + region}?`;
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            // Mostrar loading
            const submitBtn = document.querySelector('#alertForm button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
            submitBtn.disabled = true;

            const response = await fetch(`${this.baseUrl}/admin/send-alert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    region,
                    type,
                    title,
                    message,
                    includeWeather,
                    password
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess(`Alerta enviado com sucesso para ${result.data.sentCount} usuários!`);

                // Limpar formulário
                document.getElementById('alertForm').reset();
                document.getElementById('charCount').textContent = '0';

                // Atualizar alertas recentes
                this.loadRecentAlerts();
            } else {
                this.showError(result.error || 'Erro ao enviar alerta');
            }

        } catch (error) {
            console.error('Erro ao enviar alerta:', error);
            this.showError('Erro de conexão ao enviar alerta');
        } finally {
            // Restaurar botão
            const submitBtn = document.querySelector('#alertForm button[type="submit"]');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async loadRecentAlerts() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/recent-alerts`);
            const data = await response.json();

            if (data.success) {
                this.updateRecentAlertsDisplay(data.data);
            }
        } catch (error) {
            console.error('Erro ao carregar alertas recentes:', error);
        }
    }

    updateRecentAlertsDisplay(alerts) {
        const container = document.getElementById('recentAlerts');
        if (!container) return;

        if (alerts.length === 0) {
            container.innerHTML = '<p class="text-muted small">Nenhum alerta enviado recentemente</p>';
            return;
        }

        container.innerHTML = alerts.slice(0, 5).map(alert => `
            <div class="border-start border-3 border-primary ps-2 mb-2">
                <small class="text-muted">${this.formatDate(alert.timestamp)}</small>
                <div class="fw-bold">${alert.title}</div>
                <small class="text-muted">${alert.region} • ${alert.sentCount} usuários</small>
            </div>
        `).join('');
    }
}

// Global functions for UI interactions
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionId)?.classList.add('active');

    // Add active class to clicked sidebar item
    event.target.classList.add('active');

    // Load section-specific data
    if (sectionId === 'logs') {
        admin.refreshLogs();
    }
}

function refreshData() {
    admin.refreshData();
}

function refreshLogs() {
    admin.refreshLogs();
}

// Funções para sistema de alertas
function loadRegionStats() {
    admin.loadRegionStats();
}

function previewAlert() {
    admin.previewAlert();
}

function confirmSendAlert() {
    // Fechar modal e enviar alerta
    const modal = bootstrap.Modal.getInstance(document.getElementById('alertPreviewModal'));
    modal.hide();
    admin.sendAlert();
}

// Authentication helpers (mirrors login.js behavior)
const _TOKEN_KEY = 'tempbot_admin_token';
function _getToken() { return localStorage.getItem(_TOKEN_KEY); }
function logoutAdmin() {
    localStorage.removeItem(_TOKEN_KEY);
    // redirect to login
    window.location.href = 'login.html';
}

// Expose logout to global scope so index.html can call it
window.logoutAdmin = logoutAdmin;

// Initialize dashboard only when authenticated
if (_getToken()) {
    const admin = new AdminDashboard();
    window.admin = admin;
} else {
    // Not logged in: redirect to login
    window.location.href = 'login.html';
}
