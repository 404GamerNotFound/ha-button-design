/*
 * Button Switch Card
 * A Home Assistant custom Lovelace card with an orange button-style layout.
 */

class ButtonSwitchCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("button-switch-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:button-switch-card",
      entity: "switch.tv",
      name: "TV",
      icon: "mdi:radiator",
      compact: false,
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Button Switch Card: You need to define an entity.");
    }
    if (!config.entity.startsWith("switch.")) {
      throw new Error("Button Switch Card: The entity must be from the switch domain (switch.*).");
    }

    this._config = {
      name: "",
      title: "",
      icon: "mdi:radiator",
      compact: false,
      power_entity: "",
      power_value: "",
      power_unit: "W",
      on_label: "SWITCH ON",
      off_label: "SWITCH OFF",
      state_text_on: "Active",
      state_text_off: "Idle",
      background_start: "#ffa20f",
      background_end: "#ff9800",
      track_color: "rgba(255,255,255,0.25)",
      track_inner_color: "rgba(255,255,255,0.45)",
      knob_color: "#d9d9d9",
      chip_active_background: "rgba(216, 133, 0, 0.8)",
      chip_inactive_background: "rgba(255,255,255,0.14)",
      slider_orientation: "vertical",
      button_color: "",
      name_content: "entity",
      show_power_secondary: true,
      power_thresholds: [],
      tap_action: { action: "toggle" },
      hold_action: { action: "more-info" },
      double_tap_action: { action: "toggle" },
      ...config,
    };

    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 4;
  }

  _isOn(stateObj) {
    if (!stateObj) return false;
    return stateObj.state === "on";
  }

  _toggleSwitch() {
    if (!this._hass || !this._config) return;

    const entityId = this._config.entity;
    this._hass.callService("switch", "toggle", { entity_id: entityId });
  }

  _fireAction(actionName) {
    if (!this._hass || !this._config) return;
    const action = this._config[actionName];

    if (!action || !action.action || action.action === "toggle") {
      this._toggleSwitch();
      return;
    }

    if (action.action === "call-service" && action.service) {
      const [domain, service] = action.service.split(".");
      this._hass.callService(domain, service, action.service_data || {});
      return;
    }

    if (action.action === "more-info") {
      this.dispatchEvent(
        new CustomEvent("hass-more-info", {
          bubbles: true,
          composed: true,
          detail: { entityId: this._config.entity },
        })
      );
    }
  }

  _getPowerText() {
    if (!this._config) return "";

    if (this._config.power_entity && this._hass) {
      const powerState = this._hass.states[this._config.power_entity];
      if (powerState) {
        const state = powerState.state;
        const unit = powerState.attributes?.unit_of_measurement || this._config.power_unit || "W";
        return `${state} ${unit}`.trim();
      }
    }

    if (this._config.power_value !== "" && this._config.power_value !== undefined) {
      const unit = this._config.power_unit || "W";
      return `${this._config.power_value} ${unit}`.trim();
    }

    return "";
  }

  _getPowerNumericValue() {
    if (!this._config) return null;

    if (this._config.power_entity && this._hass) {
      const powerState = this._hass.states[this._config.power_entity];
      if (powerState) {
        const parsed = Number.parseFloat(powerState.state);
        return Number.isFinite(parsed) ? parsed : null;
      }
    }

    if (this._config.power_value !== "" && this._config.power_value !== undefined) {
      const parsed = Number.parseFloat(this._config.power_value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  _getPowerThresholds() {
    const rawThresholds = this._config?.power_thresholds;
    if (!rawThresholds) return [];

    let list = rawThresholds;
    if (typeof rawThresholds === "string") {
      try {
        list = JSON.parse(rawThresholds);
      } catch (error) {
        return [];
      }
    }

    if (!Array.isArray(list)) return [];

    return list
      .map((entry) => {
        const threshold =
          entry?.above ?? entry?.threshold ?? entry?.value ?? entry?.watts ?? entry?.watt;
        const parsedThreshold = Number.parseFloat(threshold);
        if (!Number.isFinite(parsedThreshold) || !entry?.color) return null;
        return { threshold: parsedThreshold, color: entry.color };
      })
      .filter(Boolean)
      .sort((a, b) => a.threshold - b.threshold);
  }

  _getActiveButtonColor() {
    if (!this._config) return "";

    const numericPower = this._getPowerNumericValue();
    const thresholds = this._getPowerThresholds();

    if (numericPower !== null && thresholds.length) {
      const matched = thresholds.filter((entry) => numericPower >= entry.threshold).pop();
      if (matched) return matched.color;
    }

    return this._config.button_color || "";
  }

  render() {
    if (!this.shadowRoot || !this._config) return;

    const stateObj = this._hass ? this._hass.states[this._config.entity] : null;
    const isOn = this._isOn(stateObj);
    const friendlyName =
      this._config.name || stateObj?.attributes?.friendly_name || this._config.entity;
    const title = this._config.title || friendlyName;
    const powerText = this._getPowerText();
    const compactClass = this._config.compact ? "compact" : "";
    const sliderOrientation =
      this._config.slider_orientation === "horizontal" ? "horizontal" : "vertical";
    const displayName = this._config.name_content === "power" && powerText ? powerText : friendlyName;
    const showSecondaryPower = Boolean(powerText) && this._config.show_power_secondary;
    const compactPrimaryText = showSecondaryPower ? powerText : isOn ? "ON" : "OFF";
    const activeButtonColor = this._getActiveButtonColor();
    const cardBackground = activeButtonColor
      ? `linear-gradient(180deg, ${activeButtonColor}, ${activeButtonColor})`
      : `linear-gradient(180deg, ${this._config.background_start}, ${this._config.background_end})`;

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card ${compactClass}" role="button" tabindex="0" aria-label="Toggle ${friendlyName}">
          ${
            this._config.compact
              ? `
          <div class="compact-title">${title}</div>
          <div class="compact-switch-wrap">
            <div class="compact-track ${sliderOrientation}">
              <div class="compact-track-line"></div>
              <div class="compact-knob ${isOn ? "on" : "off"}">
                ${this._config.icon ? `<ha-icon icon="${this._config.icon}"></ha-icon>` : ""}
              </div>
            </div>
          </div>
          <div class="compact-footer">
            <div class="compact-state ${isOn ? "active" : ""} ${showSecondaryPower ? "power" : ""}">${compactPrimaryText}</div>
            ${showSecondaryPower ? `<div class="compact-mode">${isOn ? "ON" : "OFF"}</div>` : ""}
          </div>
          `
              : `
          <div class="top-row">
            <div class="label-block">
              <div class="label-title">CURRENT</div>
              <div class="label-value">${isOn ? "ON" : "OFF"}</div>
            </div>
            <div class="label-block right">
              <div class="label-title">ENTITY</div>
              <div class="label-value entity">${this._config.entity}</div>
            </div>
          </div>

          <div class="main-name">${displayName}</div>

          <div class="switch-wrap">
            <div class="track ${sliderOrientation}">
              <div class="track-line"></div>
              <div class="knob ${isOn ? "on" : "off"}">
                ${this._config.icon ? `<ha-icon icon="${this._config.icon}"></ha-icon>` : ""}
              </div>
            </div>
          </div>

          <div class="bottom-row">
            <div class="chip ${isOn ? "active" : ""}">${isOn ? "ON" : "OFF"}</div>
            <div class="status-pill">${isOn ? this._config.on_label : this._config.off_label}</div>
            <div class="state-text">${isOn ? this._config.state_text_on : this._config.state_text_off}</div>
          </div>
          `
          }
        </div>
      </ha-card>

      <style>
        :host {
          display: block;
        }

        ha-card {
          border-radius: 28px;
          overflow: hidden;
          box-shadow: none;
        }

        .card {
          min-height: 470px;
          background: ${cardBackground};
          color: #fff;
          padding: 26px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          cursor: pointer;
          user-select: none;
          outline: none;
        }

        .card.compact {
          min-height: 0;
          aspect-ratio: 1 / 1;
          padding: 14px;
          border-radius: 20px;
          gap: 6px;
          justify-content: flex-start;
        }

        .card:focus-visible {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
          border-radius: 20px;
        }

        .compact-title {
          text-align: center;
          font-size: clamp(14px, 5.6vw, 18px);
          font-weight: 700;
          letter-spacing: 0.3px;
          font-family: "Arial", sans-serif;
          line-height: 1.1;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          text-wrap: balance;
          min-height: 1.2em;
        }

        .compact-switch-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }

        .compact-track {
          width: 64px;
          height: 122px;
          border-radius: 32px;
          background: ${this._config.track_color};
          position: relative;
          border: 2px solid rgba(255, 255, 255, 0.28);
          box-shadow: inset 0 6px 14px rgba(0, 0, 0, 0.1);
        }

        .compact-track-line {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 18px;
          bottom: 18px;
          width: 9px;
          border-radius: 12px;
          background: ${this._config.track_inner_color};
        }

        .compact-track.horizontal {
          width: 122px;
          height: 64px;
        }

        .compact-track.horizontal .compact-track-line {
          left: 18px;
          right: 18px;
          top: 50%;
          bottom: auto;
          width: auto;
          height: 9px;
          transform: translateY(-50%);
        }

        .compact-knob {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: ${this._config.knob_color};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: top 0.25s ease, bottom 0.25s ease;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .compact-knob.on {
          top: 12px;
        }

        .compact-knob.off {
          bottom: 12px;
        }

        .compact-track.horizontal .compact-knob {
          top: 50%;
          transform: translateY(-50%);
        }

        .compact-track.horizontal .compact-knob.on {
          left: 12px;
        }

        .compact-track.horizontal .compact-knob.off {
          left: auto;
          right: 12px;
        }

        .compact-knob ha-icon {
          --mdc-icon-size: 22px;
        }

        .compact-footer {
          display: grid;
          gap: 6px;
          justify-items: center;
          margin-top: auto;
        }

        .compact-state {
          border-radius: 20px;
          padding: 5px 12px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-size: 12px;
          border: 1px solid rgba(255, 255, 255, 0.45);
          background: ${this._config.chip_inactive_background};
        }

        .compact-state.active {
          background: ${this._config.chip_active_background};
          border-color: transparent;
        }

        .compact-state.power {
          text-transform: none;
          letter-spacing: 0.2px;
          padding: 6px 12px;
        }

        .compact-mode {
          font-size: clamp(13px, 5.4vw, 17px);
          font-weight: 700;
          font-family: "Arial", sans-serif;
          line-height: 1.1;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .top-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-family: "Arial", sans-serif;
        }

        .label-title {
          font-size: 12px;
          letter-spacing: 2px;
          opacity: 0.85;
        }

        .label-value {
          margin-top: 8px;
          font-size: 20px;
          font-weight: 700;
        }

        .right {
          text-align: right;
        }

        .entity {
          font-size: 12px;
          opacity: 0.9;
          word-break: break-word;
          max-width: 160px;
        }

        .main-name {
          font-size: 48px;
          line-height: 1.05;
          font-weight: 700;
          margin: 28px 0 20px;
          text-align: center;
          font-family: "Arial", sans-serif;
        }

        .switch-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
        }

        .track {
          width: 160px;
          height: 340px;
          border-radius: 80px;
          background: ${this._config.track_color};
          position: relative;
          border: 2px solid rgba(255, 255, 255, 0.28);
          box-shadow: inset 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        .track-line {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 32px;
          bottom: 32px;
          width: 18px;
          border-radius: 12px;
          background: ${this._config.track_inner_color};
        }

        .track.horizontal {
          width: 340px;
          height: 160px;
        }

        .track.horizontal .track-line {
          left: 32px;
          right: 32px;
          top: 50%;
          bottom: auto;
          width: auto;
          height: 18px;
          transform: translateY(-50%);
        }

        .knob {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 124px;
          height: 124px;
          border-radius: 36px;
          background: ${this._config.knob_color};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: top 0.25s ease, bottom 0.25s ease, transform 0.25s ease;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        }

        .knob.on {
          top: 38px;
        }

        .knob.off {
          bottom: 38px;
        }

        .track.horizontal .knob {
          top: 50%;
          transform: translateY(-50%);
        }

        .track.horizontal .knob.on {
          left: 38px;
        }

        .track.horizontal .knob.off {
          left: auto;
          right: 38px;
        }

        .knob ha-icon {
          --mdc-icon-size: 44px;
        }

        .bottom-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 12px;
          align-items: center;
          margin-top: 20px;
        }

        .chip,
        .status-pill {
          border-radius: 28px;
          padding: 10px 16px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-size: 14px;
          border: 1px solid rgba(255, 255, 255, 0.45);
          background: ${this._config.chip_inactive_background};
        }

        .chip.active {
          background: ${this._config.chip_active_background};
          border-color: transparent;
        }

        .state-text {
          font-size: 36px;
          font-weight: 700;
          text-align: right;
          font-family: "Arial", sans-serif;
        }

        @media (max-width: 768px) {
          .card {
            min-height: 420px;
            padding: 20px;
          }

          .main-name {
            font-size: 36px;
          }

          .track {
            width: 140px;
            height: 280px;
          }

          .track.horizontal {
            width: 280px;
            height: 140px;
          }

          .knob {
            width: 106px;
            height: 106px;
            border-radius: 30px;
          }

          .knob.on {
            top: 28px;
          }

          .knob.off {
            bottom: 28px;
          }

          .track.horizontal .knob.on {
            left: 28px;
          }

          .track.horizontal .knob.off {
            right: 28px;
          }

          .state-text {
            font-size: 28px;
          }

          .card.compact {
            padding: 12px;
            gap: 6px;
          }

          .compact-track {
            width: 58px;
            height: 112px;
          }

          .compact-track.horizontal {
            width: 112px;
            height: 58px;
          }

          .compact-knob {
            width: 44px;
            height: 44px;
          }

          .compact-title {
            font-size: clamp(13px, 5.4vw, 16px);
          }

          .compact-mode {
            font-size: clamp(12px, 5vw, 15px);
          }
        }
      </style>
    `;

    const card = this.shadowRoot.querySelector(".card");
    card.addEventListener("click", () => this._fireAction("tap_action"));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this._fireAction("tap_action");
      }
    });

    card.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this._fireAction("hold_action");
    });

    card.addEventListener("dblclick", (event) => {
      event.preventDefault();
      this._fireAction("double_tap_action");
    });
  }
}

class ButtonSwitchCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      entity: "",
      name: "",
      title: "",
      icon: "mdi:radiator",
      compact: false,
      power_entity: "",
      power_value: "",
      power_unit: "W",
      slider_orientation: "vertical",
      button_color: "",
      name_content: "entity",
      show_power_secondary: true,
      power_thresholds: [],
      on_label: "SWITCH ON",
      off_label: "SWITCH OFF",
      state_text_on: "Active",
      state_text_off: "Idle",
      background_start: "#ffa20f",
      background_end: "#ff9800",
      track_color: "rgba(255,255,255,0.25)",
      track_inner_color: "rgba(255,255,255,0.45)",
      knob_color: "#d9d9d9",
      chip_active_background: "rgba(216, 133, 0, 0.8)",
      chip_inactive_background: "rgba(255,255,255,0.14)",
      tap_action: { action: "toggle" },
      hold_action: { action: "more-info" },
      double_tap_action: { action: "toggle" },
      ...config,
    };

    if (!Array.isArray(this._config.power_thresholds)) {
      this._config.power_thresholds = [];
    }

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _valueChanged(event) {
    if (!this._config) return;
    const target = event.target;
    const field = target?.dataset?.field;
    if (!field) return;

    const detailValue = event.detail?.value;
    const rawValue = detailValue !== undefined ? detailValue : target.value;
    const value =
      target.type === "checkbox"
        ? target.checked
        : typeof rawValue === "string"
        ? rawValue.trim()
        : rawValue;
    const nextConfig = { ...this._config };
    if (typeof value === "boolean") {
      nextConfig[field] = value;
    } else if (value) {
      nextConfig[field] = value;
    } else {
      delete nextConfig[field];
    }

    this._config = nextConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: nextConfig },
      })
    );
  }

  _actionChanged(event) {
    if (!this._config) return;
    const target = event.target;
    const actionField = target?.dataset?.actionField;
    const key = target?.dataset?.actionKey;
    if (!actionField || !key) return;

    const nextConfig = { ...this._config };
    const currentAction = { ...(nextConfig[actionField] || {}) };
    const value = target.value?.trim?.() ?? target.value;

    if (!value) {
      delete currentAction[key];
    } else if (key === "service_data") {
      try {
        currentAction[key] = JSON.parse(value);
      } catch (error) {
        return;
      }
    } else {
      currentAction[key] = value;
    }

    if (!currentAction.action) {
      currentAction.action = "toggle";
    }
    nextConfig[actionField] = currentAction;
    this._config = nextConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: nextConfig },
      })
    );
  }

  _thresholdChanged(index, key, value) {
    const thresholds = [...(this._config.power_thresholds || [])];
    const current = { ...(thresholds[index] || { above: "", color: "#ff0000" }) };
    current[key] = value;
    thresholds[index] = current;
    this._config = { ...this._config, power_thresholds: thresholds };
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: this._config },
      })
    );
    this._render();
  }

  _addThreshold() {
    const thresholds = [...(this._config.power_thresholds || [])];
    thresholds.push({ above: "", color: "#ff0000" });
    this._config = { ...this._config, power_thresholds: thresholds };
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: this._config },
      })
    );
    this._render();
  }

  _removeThreshold(index) {
    const thresholds = [...(this._config.power_thresholds || [])];
    thresholds.splice(index, 1);
    this._config = { ...this._config, power_thresholds: thresholds };
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: this._config },
      })
    );
    this._render();
  }

  _renderActionFields(actionField, label) {
    const action = this._config[actionField] || { action: "toggle" };
    const serviceData =
      typeof action.service_data === "object"
        ? JSON.stringify(action.service_data)
        : action.service_data || "";
    return `
      <fieldset class="action-group">
        <legend>${label}</legend>
        <label class="orientation-field">
          <span>Action type</span>
          <select data-action-field="${actionField}" data-action-key="action">
            <option value="toggle" ${action.action !== "more-info" && action.action !== "call-service" ? "selected" : ""}>Toggle</option>
            <option value="more-info" ${action.action === "more-info" ? "selected" : ""}>More info</option>
            <option value="call-service" ${action.action === "call-service" ? "selected" : ""}>Call service</option>
          </select>
        </label>
        <ha-textfield
          label="Service (for call-service)"
          helper="Example: light.turn_on"
          data-action-field="${actionField}"
          data-action-key="service"
          value="${action.service || ""}"
        ></ha-textfield>
        <ha-textfield
          label="Service data JSON"
          helper='Example: {"entity_id":"switch.tv"}'
          data-action-field="${actionField}"
          data-action-key="service_data"
          value='${serviceData.replace(/'/g, "&apos;")}'
        ></ha-textfield>
      </fieldset>
    `;
  }

  _render() {
    if (!this._config) return;

    this.innerHTML = `
      <div class="card-config">
        <ha-entity-picker
          label="Switch entity"
          include-domains="switch"
          data-field="entity"
          value="${this._config.entity || ""}"
        ></ha-entity-picker>
        <ha-textfield
          label="Name"
          data-field="name"
          value="${this._config.name || ""}"
        ></ha-textfield>
        <ha-textfield
          label="Title (compact)"
          data-field="title"
          value="${this._config.title || ""}"
        ></ha-textfield>
        <ha-textfield
          label="Icon"
          helper="Example: mdi:radiator"
          data-field="icon"
          value="${this._config.icon || ""}"
        ></ha-textfield>
        <ha-textfield
          label="Power entity (optional)"
          helper="Example: sensor.tv_power"
          data-field="power_entity"
          value="${this._config.power_entity || ""}"
        ></ha-textfield>
        <ha-textfield
          label="Power value fallback"
          helper="Example: 120"
          data-field="power_value"
          value="${this._config.power_value || ""}"
        ></ha-textfield>
        <ha-textfield
          label="Power unit"
          helper="Default: W"
          data-field="power_unit"
          value="${this._config.power_unit || ""}"
        ></ha-textfield>
        <ha-textfield
          label="Button color override (optional)"
          helper="Example: #ff9800"
          data-field="button_color"
          value="${this._config.button_color || ""}"
        ></ha-textfield>
        <ha-textfield label="On label" data-field="on_label" value="${this._config.on_label || ""}"></ha-textfield>
        <ha-textfield label="Off label" data-field="off_label" value="${this._config.off_label || ""}"></ha-textfield>
        <ha-textfield label="State text when on" data-field="state_text_on" value="${this._config.state_text_on || ""}"></ha-textfield>
        <ha-textfield label="State text when off" data-field="state_text_off" value="${this._config.state_text_off || ""}"></ha-textfield>
        <ha-textfield label="Background start" data-field="background_start" value="${this._config.background_start || ""}"></ha-textfield>
        <ha-textfield label="Background end" data-field="background_end" value="${this._config.background_end || ""}"></ha-textfield>
        <ha-textfield label="Track color" data-field="track_color" value="${this._config.track_color || ""}"></ha-textfield>
        <ha-textfield label="Track inner color" data-field="track_inner_color" value="${this._config.track_inner_color || ""}"></ha-textfield>
        <ha-textfield label="Knob color" data-field="knob_color" value="${this._config.knob_color || ""}"></ha-textfield>
        <ha-textfield label="Chip active background" data-field="chip_active_background" value="${this._config.chip_active_background || ""}"></ha-textfield>
        <ha-textfield label="Chip inactive background" data-field="chip_inactive_background" value="${this._config.chip_inactive_background || ""}"></ha-textfield>
        <ha-formfield label="Compact square layout">
          <ha-switch
            data-field="compact"
            ${this._config.compact ? "checked" : ""}
          ></ha-switch>
        </ha-formfield>
        <ha-formfield label="Show power below compact switch">
          <ha-switch
            data-field="show_power_secondary"
            ${this._config.show_power_secondary ? "checked" : ""}
          ></ha-switch>
        </ha-formfield>
        <label class="orientation-field">
          <span>Name content</span>
          <select data-field="name_content">
            <option
              value="entity"
              ${this._config.name_content !== "power" ? "selected" : ""}
            >
              Entity name
            </option>
            <option
              value="power"
              ${this._config.name_content === "power" ? "selected" : ""}
            >
              Power text
            </option>
          </select>
        </label>
        <label class="orientation-field">
          <span>Slider orientation</span>
          <select data-field="slider_orientation">
            <option
              value="vertical"
              ${this._config.slider_orientation !== "horizontal" ? "selected" : ""}
            >
              Vertical
            </option>
            <option
              value="horizontal"
              ${this._config.slider_orientation === "horizontal" ? "selected" : ""}
            >
              Horizontal
            </option>
          </select>
        </label>
        ${this._renderActionFields("tap_action", "Tap action")}
        ${this._renderActionFields("hold_action", "Hold action")}
        ${this._renderActionFields("double_tap_action", "Double tap action")}
        <fieldset class="action-group">
          <legend>Power thresholds</legend>
          <p class="helper">Define dynamic button colors by power values.</p>
          ${(this._config.power_thresholds || [])
            .map(
              (entry, index) => `
                <div class="threshold-row" data-index="${index}">
                  <ha-textfield label="Above" type="number" data-threshold-index="${index}" data-threshold-key="above" value="${entry.above ?? ""}"></ha-textfield>
                  <ha-textfield label="Color" data-threshold-index="${index}" data-threshold-key="color" value="${entry.color || ""}"></ha-textfield>
                  <button type="button" data-remove-threshold="${index}">Remove</button>
                </div>
              `
            )
            .join("")}
          <button type="button" class="add-threshold">Add threshold</button>
        </fieldset>
      </div>
      <style>
        .card-config {
          display: grid;
          gap: 12px;
        }

        .orientation-field {
          display: grid;
          gap: 6px;
          font-size: 14px;
        }

        .orientation-field select {
          background: transparent;
          color: inherit;
          border: 1px solid rgba(127, 127, 127, 0.5);
          border-radius: 4px;
          padding: 8px;
          font: inherit;
        }

        .action-group {
          display: grid;
          gap: 8px;
          border: 1px solid rgba(127, 127, 127, 0.5);
          border-radius: 6px;
          padding: 10px;
          margin: 0;
        }

        .action-group legend {
          padding: 0 4px;
        }

        .threshold-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .helper {
          margin: 0;
          font-size: 12px;
          opacity: 0.8;
        }

        button {
          border: 1px solid rgba(127, 127, 127, 0.5);
          border-radius: 6px;
          background: transparent;
          color: inherit;
          padding: 8px 12px;
          cursor: pointer;
        }
      </style>
    `;

    this.querySelectorAll("ha-textfield[data-field]").forEach((input) => {
      input.addEventListener("change", (event) => this._valueChanged(event));
      input.addEventListener("input", (event) => this._valueChanged(event));
    });

    this.querySelectorAll("ha-textfield[data-action-field], select[data-action-field]").forEach((input) => {
      input.addEventListener("change", (event) => this._actionChanged(event));
      input.addEventListener("input", (event) => this._actionChanged(event));
    });

    this.querySelectorAll("ha-textfield[data-threshold-index]").forEach((input) => {
      const index = Number(input.dataset.thresholdIndex);
      const key = input.dataset.thresholdKey;
      input.addEventListener("change", (event) => this._thresholdChanged(index, key, event.target.value));
      input.addEventListener("input", (event) => this._thresholdChanged(index, key, event.target.value));
    });

    const entityPicker = this.querySelector('ha-entity-picker[data-field="entity"]');
    if (entityPicker) {
      entityPicker.hass = this._hass;
      entityPicker.addEventListener("value-changed", (event) => this._valueChanged(event));
      entityPicker.addEventListener("change", (event) => this._valueChanged(event));
    }

    this.querySelectorAll("ha-switch").forEach((input) => {
      input.addEventListener("change", (event) => this._valueChanged(event));
    });

    this.querySelectorAll('select[data-field="slider_orientation"], select[data-field="name_content"]').forEach(
      (input) => {
        input.addEventListener("change", (event) => this._valueChanged(event));
      }
    );

    const addThresholdButton = this.querySelector("button.add-threshold");
    if (addThresholdButton) {
      addThresholdButton.addEventListener("click", () => this._addThreshold());
    }

    this.querySelectorAll("button[data-remove-threshold]").forEach((button) => {
      const index = Number(button.dataset.removeThreshold);
      button.addEventListener("click", () => this._removeThreshold(index));
    });
  }
}

if (!customElements.get("button-switch-card")) {
  customElements.define("button-switch-card", ButtonSwitchCard);
}

if (!customElements.get("heat-switch-card")) {
  customElements.define("heat-switch-card", ButtonSwitchCard);
}

if (!customElements.get("button-switch-card-editor")) {
  customElements.define("button-switch-card-editor", ButtonSwitchCardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "custom:button-switch-card",
  name: "Button Switch Card",
  description: "Switch on/off card with a vertical button-style design.",
  preview: true,
  documentationURL: "https://github.com/mixelpixx/ha-button-design",
});

window.customCards.push({
  type: "custom:heat-switch-card",
  name: "Heat Switch Card (alias)",
  description: "Compatibility alias for Button Switch Card.",
  preview: true,
  documentationURL: "https://github.com/mixelpixx/ha-button-design",
});
