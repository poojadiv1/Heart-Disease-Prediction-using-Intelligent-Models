class HeartRiskDashboard extends HTMLElement {
  constructor() {
    super();
    this.healthTips = [
      "Walk for at least 30 minutes today to support cardiovascular health.",
      "Choose lower-sodium meals to help manage blood pressure.",
      "Drink enough water and reduce sugary drinks where possible.",
      "Sleep 7 to 8 hours to support recovery and heart health.",
      "Track your cholesterol-friendly food choices this week.",
      "Take short breaks from sitting to improve circulation."
    ];

    this.state = {
      token: window.localStorage.getItem("heart-token") || "",
      user: null,
      features: [],
      samples: [],
      dataset: null,
      metrics: null,
      form: {},
      result: null,
      scenario: null,
      history: [],
      authMode: "login",
      authForm: {
        username: "",
        password: ""
      },
      tip: this.healthTips[0]
    };
  }

  connectedCallback() {
    this.innerHTML = `
      <main class="app-shell">
        <section id="appRoot"></section>
      </main>
    `;
    this.bootstrap();
  }

  authHeaders(includeJson = false) {
    const headers = {};
    if (includeJson) {
      headers["Content-Type"] = "application/json";
    }
    if (this.state.token) {
      headers.Authorization = `Bearer ${this.state.token}`;
    }
    return headers;
  }

  pickTip() {
    const index = Math.floor(Math.random() * this.healthTips.length);
    this.state.tip = this.healthTips[index];
  }

  async bootstrap() {
    const [bootstrapResponse, modelInfoResponse] = await Promise.all([
      fetch("/api/bootstrap"),
      fetch("/model-info")
    ]);
    const bootstrap = await bootstrapResponse.json();
    const modelInfo = await modelInfoResponse.json();

    this.state.features = bootstrap.features;
    this.state.samples = bootstrap.samples;
    this.state.dataset = modelInfo.dataset;
    this.state.metrics = modelInfo.metrics;
    this.state.form = { ...bootstrap.defaultPatient };

    if (this.state.token) {
      await this.loadCurrentUser();
      if (this.state.user) {
        this.pickTip();
        await this.loadHistory();
        await this.predict();
      }
    }

    this.render();
  }

  async loadCurrentUser() {
    const response = await fetch("/me", {
      headers: this.authHeaders()
    });

    if (!response.ok) {
      this.state.token = "";
      this.state.user = null;
      window.localStorage.removeItem("heart-token");
      return;
    }

    const payload = await response.json();
    this.state.user = payload.user;
  }

  async loadHistory() {
    if (!this.state.token) {
      this.state.history = [];
      return;
    }

    const response = await fetch("/history?limit=10", {
      headers: this.authHeaders()
    });
    const payload = await response.json();
    this.state.history = response.ok ? payload.history || [] : [];
  }

  async submitAuth(mode) {
    const response = await fetch(mode === "register" ? "/register" : "/login", {
      method: "POST",
      headers: this.authHeaders(true),
      body: JSON.stringify(this.state.authForm)
    });
    const payload = await response.json();

    if (!response.ok) {
      window.alert(payload.error || "Authentication failed");
      return;
    }

    this.state.token = payload.token;
    this.state.user = payload.user;
    window.localStorage.setItem("heart-token", payload.token);
    this.pickTip();
    await this.loadHistory();
    await this.predict();
  }

  async logout() {
    await fetch("/logout", {
      method: "POST",
      headers: this.authHeaders()
    });

    this.state.token = "";
    this.state.user = null;
    this.state.result = null;
    this.state.scenario = null;
    this.state.history = [];
    window.localStorage.removeItem("heart-token");
    this.render();
  }

  async predict() {
    const response = await fetch("/predict", {
      method: "POST",
      headers: this.authHeaders(true),
      body: JSON.stringify(this.state.form)
    });
    this.state.result = await response.json();
    await this.runScenario();
    await this.loadHistory();
    this.render();
  }

  async runScenario() {
    const response = await fetch("/scenario", {
      method: "POST",
      headers: this.authHeaders(true),
      body: JSON.stringify({
        base: this.state.form,
        changes: {
          chol: Number(this.state.form.chol) + 30,
          trestbps: Math.max(80, Number(this.state.form.trestbps) - 10),
          oldpeak: Math.min(7, Number(this.state.form.oldpeak) + 0.4)
        }
      })
    });
    this.state.scenario = await response.json();
  }

  async exportPdf() {
    const response = await fetch("/api/report", {
      method: "POST",
      headers: this.authHeaders(true),
      body: JSON.stringify(this.state.form)
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "heart-disease-report.pdf";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  fieldMarkup(feature) {
    const value = this.state.form[feature.key];
    if (feature.type === "select") {
      return `
        <label class="form-field">
          <span>${feature.label}</span>
          <select data-field="${feature.key}">
            ${feature.options
              .map((option) => `<option value="${option.value}" ${Number(option.value) === Number(value) ? "selected" : ""}>${option.label}</option>`)
              .join("")}
          </select>
        </label>
      `;
    }

    return `
      <label class="form-field">
        <span>${feature.label}</span>
        <input data-field="${feature.key}" type="number" min="${feature.min}" max="${feature.max}" step="${feature.step}" value="${value}" />
      </label>
    `;
  }

  computeHistoryAnalysis() {
    if (!this.state.history.length) {
      return {
        total: 0,
        averageRisk: "--",
        latestTrend: "No saved predictions yet",
        commonStatus: "No Data"
      };
    }

    const total = this.state.history.length;
    const avg = this.state.history.reduce((sum, entry) => sum + Number(entry.result.confidence || 0), 0) / total;
    const highCount = this.state.history.filter((entry) => String(entry.result.prediction).toLowerCase().includes("high")).length;
    const latest = this.state.history[0];

    return {
      total,
      averageRisk: `${Math.round(avg)}%`,
      latestTrend: latest.result.prediction,
      commonStatus: highCount >= Math.ceil(total / 2) ? "High Risk dominant" : "Mixed / improving"
    };
  }

  renderLoginPage() {
    this.querySelector("#appRoot").innerHTML = `
      <section class="login-screen">
        <article class="login-card">
          <p class="card-eyebrow">LookaHealth</p>
          <h1>Heart Disease Prediction</h1>
          <p class="card-copy">Login to access the medical form, saved predictions, prediction summaries, and a fresh health tip for the day.</p>
          <div class="auth-fields">
            <label class="form-field">
              <span>Username</span>
              <input data-auth-input="username" type="text" value="${this.state.authForm.username}" />
            </label>
            <label class="form-field">
              <span>Password</span>
              <input data-auth-input="password" type="password" value="${this.state.authForm.password}" />
            </label>
          </div>
          <div class="button-row">
            <button class="primary-button" id="authSubmit" type="button">${this.state.authMode === "login" ? "Login" : "Register"}</button>
            <button class="ghost-button" id="authSwitch" type="button">${this.state.authMode === "login" ? "Create account" : "Back to login"}</button>
          </div>
        </article>
      </section>
    `;

    this.attachEvents();
  }

  renderDashboard() {
    const analysis = this.computeHistoryAnalysis();
    const accuracy = this.state.metrics ? `${Math.round(this.state.metrics.test_accuracy * 1000) / 10}%` : "--";

    this.querySelector("#appRoot").innerHTML = `
      <header class="topbar simple">
        <div class="brand">
          <div class="brand-mark"></div>
          <div>
            <strong>LookaHealth</strong>
            <span>Prediction Dashboard</span>
          </div>
        </div>
        <div class="user-strip">
          <div class="avatar">${this.state.user.username.slice(0, 1).toUpperCase()}</div>
          <span class="user-name">${this.state.user.username}</span>
          <button class="ghost-button" id="logoutButton" type="button">Logout</button>
        </div>
      </header>

      <section class="dashboard-grid">
        <article class="surface dashboard-card form-card">
          <div class="card-title-row">
            <div>
              <p class="card-eyebrow">1. Medical Form Patient Inputs</p>
              <h3>Clinical form</h3>
            </div>
            <div class="button-row">
              <button class="primary-button" id="predictButton" type="button">Predict</button>
              <button class="ghost-button" id="reportButton" type="button">Export</button>
            </div>
          </div>
          <div class="sample-pills">
            ${this.state.samples.map((sample) => `<button class="sample-pill" data-sample="${sample.id}" type="button">${sample.name}</button>`).join("")}
          </div>
          <div class="form-grid compact-grid">
            ${this.state.features.map((feature) => this.fieldMarkup(feature)).join("")}
          </div>
        </article>

        <article class="surface dashboard-card summary-card">
          <div class="card-title-row">
            <div>
              <p class="card-eyebrow">2. Prediction Records and Summaries</p>
              <h3>Latest prediction</h3>
            </div>
            <span class="metric-badge">Model accuracy ${accuracy}</span>
          </div>
          <div class="summary-stack">
            <div class="metric-panel accent">
              <span>Prediction</span>
              <strong>${this.state.result.prediction}</strong>
              <small>${this.state.result.binaryPrediction}</small>
            </div>
            <div class="metric-panel">
              <span>Confidence</span>
              <strong>${this.state.result.confidence}%</strong>
              <small>${this.state.result.riskBand}</small>
            </div>
            <div class="metric-panel">
              <span>Top Features</span>
              <strong>${this.state.result.important_features.join(", ")}</strong>
              <small>${this.state.result.explanation}</small>
            </div>
            <div class="metric-panel">
              <span>Scenario Delta</span>
              <strong>${this.state.scenario.deltaRisk > 0 ? "+" : ""}${this.state.scenario.deltaRisk}%</strong>
              <small>${this.state.scenario.summary}</small>
            </div>
          </div>
        </article>

        <article class="surface dashboard-card saved-card">
          <div class="card-title-row">
            <div>
              <p class="card-eyebrow">3. Saved Predictions</p>
              <h3>Recent records</h3>
            </div>
          </div>
          <div class="saved-list">
            ${this.state.history.length
              ? this.state.history.map((entry) => `
                  <button class="saved-item" data-history-id="${entry.id}" type="button">
                    <div class="saved-row">
                      <strong>${entry.result.prediction}</strong>
                      <span>${entry.result.confidence}%</span>
                    </div>
                    <div class="saved-row muted">
                      <span>${new Date(entry.createdAt).toLocaleString()}</span>
                      <span>Chol ${entry.input.chol}</span>
                    </div>
                  </button>
                `).join("")
              : `<p class="card-copy">No saved predictions yet. Run a prediction and it will appear here.</p>`}
          </div>
        </article>

        <article class="surface dashboard-card analysis-card">
          <div class="card-title-row">
            <div>
              <p class="card-eyebrow">4. Analysis on Saved Predictions</p>
              <h3>History analysis</h3>
            </div>
          </div>
          <div class="analysis-grid">
            <div class="metric-panel accent-light">
              <span>Total saved</span>
              <strong>${analysis.total}</strong>
              <small>Stored prediction runs</small>
            </div>
            <div class="metric-panel">
              <span>Average risk</span>
              <strong>${analysis.averageRisk}</strong>
              <small>Across saved records</small>
            </div>
            <div class="metric-panel">
              <span>Latest trend</span>
              <strong>${analysis.latestTrend}</strong>
              <small>Most recent prediction</small>
            </div>
            <div class="metric-panel">
              <span>History status</span>
              <strong>${analysis.commonStatus}</strong>
              <small>Simple pattern from saved data</small>
            </div>
          </div>
        </article>

        <article class="surface dashboard-card tips-card">
          <div class="card-title-row">
            <div>
              <p class="card-eyebrow">5. Daily Reminder / Health Tips</p>
              <h3>Renewed on login</h3>
            </div>
          </div>
          <div class="tip-card">
            <div class="tip-ring"><span>${Math.max(10, Math.min(95, this.state.result.confidence))}%</span></div>
            <p class="tip-copy">${this.state.tip}</p>
          </div>
        </article>
      </section>
    `;

    this.attachEvents();
  }

  attachEvents() {
    this.querySelectorAll("[data-auth-input]").forEach((element) => {
      element.oninput = (event) => {
        this.state.authForm[event.target.dataset.authInput] = event.target.value;
      };
    });

    const authSubmit = this.querySelector("#authSubmit");
    if (authSubmit) {
      authSubmit.onclick = async () => this.submitAuth(this.state.authMode);
    }

    const authSwitch = this.querySelector("#authSwitch");
    if (authSwitch) {
      authSwitch.onclick = () => {
        this.state.authMode = this.state.authMode === "login" ? "register" : "login";
        this.render();
      };
    }

    const logoutButton = this.querySelector("#logoutButton");
    if (logoutButton) {
      logoutButton.onclick = async () => this.logout();
    }

    this.querySelectorAll("[data-field]").forEach((element) => {
      element.onchange = (event) => {
        this.state.form[event.target.dataset.field] = Number(event.target.value);
      };
    });

    const predictButton = this.querySelector("#predictButton");
    if (predictButton) {
      predictButton.onclick = async () => this.predict();
    }

    const reportButton = this.querySelector("#reportButton");
    if (reportButton) {
      reportButton.onclick = async () => this.exportPdf();
    }

    this.querySelectorAll("[data-sample]").forEach((button) => {
      button.onclick = async () => {
        const sample = this.state.samples.find((entry) => entry.id === button.dataset.sample);
        this.state.form = { ...sample };
        await this.predict();
      };
    });

    this.querySelectorAll("[data-history-id]").forEach((button) => {
      button.onclick = async () => {
        const entry = this.state.history.find((item) => String(item.id) === button.dataset.historyId);
        if (!entry) {
          return;
        }
        this.state.form = { ...entry.input };
        await this.predict();
      };
    });
  }

  render() {
    if (!this.state.user) {
      this.renderLoginPage();
      return;
    }

    if (!this.state.result || !this.state.scenario) {
      return;
    }

    this.renderDashboard();
  }
}

customElements.define("heart-risk-dashboard", HeartRiskDashboard);
