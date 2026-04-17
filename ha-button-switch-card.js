/*
 * Button Switch Card
 * A Home Assistant custom Lovelace card with an orange button-style layout.
 */

class ButtonSwitchCard extends HTMLElement {
  static async getConfigElement() {
    await customElements.whenDefined("button-switch-card-editor");
    return document.createElement("button-switch-card-editor");
  }

  getConfigElement() {
    return this.constructor.getConfigElement();
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

  getStubConfig() {
    return this.constructor.getStubConfig();
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
      unavailable_label: "UNAVAILABLE",
      state_text_on: "Active",
      state_text_off: "Idle",
      state_text_unavailable: "Not available",
      background_start: "#ffa20f",
      background_end: "#ff9800",
      track_color: "rgba(255,255,255,0.25)",
      track_inner_color: "rgba(255,255,255,0.45)",
      knob_color: "#d9d9d9",
      chip_active_background: "rgba(216, 133, 0, 0.8)",
      chip_inactive_background: "rgba(255,255,255,0.14)",
      slider_orientation: "vertical",
      reverse_direction: false,
      button_color: "",
      name_content: "entity",
      show_power_secondary: true,
      show_on_off_label: true,
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
    return 2;
  }

  getGridOptions() {
    const compact = Boolean(this._config?.compact);
    return compact
      ? { rows: 4, columns: 6, min_rows: 4, min_columns: 6 }
      : { rows: 8, columns: 12, min_rows: 6, min_columns: 12 };
  }

  _isOn(stateObj) {
    if (!stateObj) return false;
    return stateObj.state === "on";
  }

  _isUnavailable(stateObj) {
    return stateObj?.state === "unavailable";
  }

  _toggleSwitch() {
    if (!this._hass || !this._config) return;

    const entityId = this._config.entity;
    this._hass.callService("switch", "toggle", { entity_id: entityId });
  }

  _fireAction(actionName) {
    if (!this._hass || !this._config) return;
    const stateObj = this._hass.states[this._config.entity];
    if (this._isUnavailable(stateObj)) {
      this.dispatchEvent(
        new CustomEvent("hass-more-info", {
          bubbles: true,
          composed: true,
          detail: { entityId: this._config.entity },
        })
      );
      return;
    }

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
    const isUnavailable = this._isUnavailable(stateObj);
    const isOn = !isUnavailable && this._isOn(stateObj);
    const friendlyName =
      this._config.name || stateObj?.attributes?.friendly_name || this._config.entity;
    const title = this._config.title || friendlyName;
    const powerText = this._getPowerText();
    const compactClass = this._config.compact ? "compact" : "";
    const sliderOrientation =
      this._config.slider_orientation === "horizontal" ? "horizontal" : "vertical";
    const reverseDirection = Boolean(this._config.reverse_direction);
    const displayName = this._config.name_content === "power" && powerText ? powerText : friendlyName;
    const showSecondaryPower = !isUnavailable && Boolean(powerText) && this._config.show_power_secondary;
    const compactPrimaryText = isUnavailable
      ? this._config.unavailable_label
      : showSecondaryPower
      ? powerText
      : isOn
      ? "ON"
      : "OFF";
    const activeButtonColor = this._getActiveButtonColor();
    const cardBackground = activeButtonColor
      ? `linear-gradient(180deg, ${activeButtonColor}, ${activeButtonColor})`
      : `linear-gradient(180deg, ${this._config.background_start}, ${this._config.background_end})`;

    const regularKnobPositionClass = isUnavailable
      ? "unavailable"
      : sliderOrientation === "horizontal"
      ? isOn === reverseDirection
        ? "start"
        : "end"
      : isOn !== reverseDirection
      ? "start"
      : "end";
    const compactKnobPositionClass = regularKnobPositionClass;
    const currentStateText = isUnavailable ? "N/A" : isOn ? "ON" : "OFF";
    const statusPillText = isUnavailable
      ? this._config.unavailable_label
      : isOn
      ? this._config.on_label
      : this._config.off_label;
    const stateText = isUnavailable
      ? this._config.state_text_unavailable
      : isOn
      ? this._config.state_text_on
      : this._config.state_text_off;
    const chipClass = isUnavailable ? "unavailable" : isOn ? "active" : "";

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card ${compactClass}" role="button" tabindex="0" aria-label="${
          isUnavailable ? `${friendlyName} unavailable` : `Toggle ${friendlyName}`
        }">
          ${
            this._config.compact
              ? `
          <div class="compact-title">${title}</div>
          <div class="compact-switch-wrap">
            <div class="compact-track ${sliderOrientation}">
              <div class="compact-track-line"></div>
              <div class="compact-knob ${compactKnobPositionClass}">
                ${this._config.icon ? `<ha-icon icon="${this._config.icon}"></ha-icon>` : ""}
              </div>
            </div>
          </div>
          <div class="compact-footer">
            <div class="compact-state ${isOn ? "active" : ""} ${showSecondaryPower ? "power" : ""}">${compactPrimaryText}</div>
            ${
              showSecondaryPower && this._config.show_on_off_label !== false
                ? `<div class="compact-mode">${isOn ? "ON" : "OFF"}</div>`
                : ""
            }
          </div>
          `
              : `
          <div class="top-row">
            <div class="label-block">
              <div class="label-title">CURRENT</div>
              <div class="label-value">${currentStateText}</div>
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
              <div class="knob ${regularKnobPositionClass}">
                ${this._config.icon ? `<ha-icon icon="${this._config.icon}"></ha-icon>` : ""}
              </div>
            </div>
          </div>

          <div class="bottom-row">
            <div class="chip ${chipClass}">${currentStateText}</div>
            ${
              this._config.show_on_off_label !== false
                ? `<div class="status-pill">${statusPillText}</div>`
                : ""
            }
            <div class="state-text">${stateText}</div>
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
          border-radius: 18px;
          overflow: hidden;
          box-shadow: none;
        }

        .card {
          min-height: 235px;
          background: ${cardBackground};
          color: #fff;
          padding: 13px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          cursor: pointer;
          user-select: none;
          outline: none;
        }

        .card.compact {
          container-type: inline-size;
          min-height: 0;
          aspect-ratio: 1 / 1;
          padding: 6%;
          border-radius: 10%;
          gap: 3%;
          justify-content: space-between;
        }

        .card:focus-visible {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
          border-radius: 16px;
        }

        .compact-title {
          text-align: center;
          font-size: clamp(14px, 11cqw, 24px);
          font-weight: 700;
          letter-spacing: 0.3px;
          font-family: "Arial", sans-serif;
          line-height: 1.05;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          text-wrap: balance;
          min-height: 2.1em;
          max-height: 2.1em;
          flex: 0 0 20%;
        }

        .compact-switch-wrap {
          flex: 0 0 40%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .compact-track {
          width: 50%;
          height: 100%;
          max-width: 46%;
          min-width: 30%;
          max-height: 100%;
          border-radius: 20%;
          background: ${this._config.track_color};
          position: relative;
          border: 2px solid rgba(255, 255, 255, 0.28);
          box-shadow: inset 0 6px 14px rgba(0, 0, 0, 0.1);
        }

        .compact-track-line {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 10px;
          bottom: 10px;
          width: 6px;
          border-radius: 12px;
          background: ${this._config.track_inner_color};
        }

        .compact-track.horizontal {
          width: 100%;
          height: 50%;
          max-height: 46%;
          min-height: 30%;
        }

        .compact-track.horizontal .compact-track-line {
          left: 10px;
          right: 10px;
          top: 50%;
          bottom: auto;
          width: auto;
          height: 6px;
          transform: translateY(-50%);
        }

        .compact-knob {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 46%;
          aspect-ratio: 1 / 1;
          border-radius: 26%;
          background: ${this._config.knob_color};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: top 0.25s ease, bottom 0.25s ease;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .compact-knob.start {
          top: 9%;
        }

        .compact-knob.end {
          bottom: 9%;
        }

        .compact-track.horizontal .compact-knob {
          top: 50%;
          transform: translateY(-50%);
        }

        .compact-track.horizontal .compact-knob.start {
          left: 9%;
        }

        .compact-track.horizontal .compact-knob.end {
          left: auto;
          right: 9%;
        }

        .compact-knob.unavailable {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.6;
        }

        .compact-knob ha-icon {
          --mdc-icon-size: clamp(12px, 6.5cqw, 19px);
        }

        .compact-footer {
          display: grid;
          gap: 6%;
          justify-items: center;
          margin-top: 0;
          flex: 0 0 30%;
        }

        .compact-state {
          border-radius: 20px;
          padding: 7% 16%;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-size: clamp(11px, 7cqw, 17px);
          border: 1px solid rgba(255, 255, 255, 0.45);
          background: ${this._config.chip_inactive_background};
          max-width: 100%;
          white-space: nowrap;
        }

        .compact-state.active {
          background: ${this._config.chip_active_background};
          border-color: transparent;
        }

        .compact-state.power {
          text-transform: none;
          letter-spacing: 0.2px;
          padding: 7% 14%;
        }

        .compact-mode {
          font-size: clamp(14px, 10cqw, 28px);
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
          gap: 6px;
          font-family: "Arial", sans-serif;
        }

        .label-title {
          font-size: 12px;
          letter-spacing: 2px;
          opacity: 0.85;
        }

        .label-value {
          margin-top: 4px;
          font-size: 10px;
          font-weight: 700;
        }

        .right {
          text-align: right;
        }

        .entity {
          font-size: 12px;
          opacity: 0.9;
          word-break: break-word;
          max-width: 80px;
        }

        .main-name {
          font-size: 24px;
          line-height: 1.05;
          font-weight: 700;
          margin: 14px 0 10px;
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
          width: 80px;
          height: 170px;
          border-radius: 40px;
          background: ${this._config.track_color};
          position: relative;
          border: 2px solid rgba(255, 255, 255, 0.28);
          box-shadow: inset 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        .track-line {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 16px;
          bottom: 16px;
          width: 9px;
          border-radius: 12px;
          background: ${this._config.track_inner_color};
        }

        .track.horizontal {
          width: 170px;
          height: 80px;
        }

        .track.horizontal .track-line {
          left: 16px;
          right: 16px;
          top: 50%;
          bottom: auto;
          width: auto;
          height: 9px;
          transform: translateY(-50%);
        }

        .knob {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 62px;
          height: 62px;
          border-radius: 18px;
          background: ${this._config.knob_color};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: top 0.25s ease, bottom 0.25s ease, transform 0.25s ease;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        }

        .knob.start {
          top: 19px;
        }

        .knob.end {
          bottom: 19px;
        }

        .track.horizontal .knob {
          top: 50%;
          transform: translateY(-50%);
        }

        .track.horizontal .knob.start {
          left: 19px;
        }

        .track.horizontal .knob.end {
          left: auto;
          right: 19px;
        }

        .knob.unavailable {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.6;
        }

        .knob ha-icon {
          --mdc-icon-size: 22px;
        }

        .bottom-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 6px;
          align-items: center;
          margin-top: 10px;
        }

        .chip,
        .status-pill {
          border-radius: 18px;
          padding: 5px 8px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-size: 11px;
          border: 1px solid rgba(255, 255, 255, 0.45);
          background: ${this._config.chip_inactive_background};
        }

        .chip.active {
          background: ${this._config.chip_active_background};
          border-color: transparent;
        }

        .chip.unavailable {
          opacity: 0.8;
        }

        .state-text {
          font-size: 18px;
          font-weight: 700;
          text-align: right;
          font-family: "Arial", sans-serif;
        }

        @media (max-width: 768px) {
          .card {
            min-height: 210px;
            padding: 10px;
          }

          .main-name {
            font-size: 18px;
          }

          .track {
            width: 70px;
            height: 140px;
          }

          .track.horizontal {
            width: 140px;
            height: 70px;
          }

          .knob {
            width: 53px;
            height: 53px;
            border-radius: 15px;
          }

          .knob.start {
            top: 14px;
          }

          .knob.end {
            bottom: 14px;
          }

          .track.horizontal .knob.start {
            left: 14px;
          }

          .track.horizontal .knob.end {
            right: 14px;
          }

          .state-text {
            font-size: 14px;
          }

          .card.compact {
            padding: 6%;
            gap: 3%;
          }

          .compact-track {
            width: 50%;
            height: 100%;
          }

          .compact-track.horizontal {
            width: 100%;
            height: 50%;
          }

          .compact-knob {
            width: 46%;
          }

          .compact-title {
            font-size: clamp(12px, 10cqw, 18px);
          }

          .compact-mode {
            font-size: clamp(12px, 9cqw, 21px);
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
  _captureFocusState(sourceElement = null) {
    const activeElement = sourceElement || this.querySelector("ha-textfield:focus, select:focus, input:focus, ha-entity-picker:focus");
    if (!activeElement) {
      this._focusState = null;
      return;
    }

    const valueElement = activeElement.inputElement || activeElement;
    this._focusState = {
      selector: activeElement.tagName
        ? `${activeElement.tagName.toLowerCase()}${activeElement.dataset?.field ? `[data-field="${activeElement.dataset.field}"]` : ""}${activeElement.dataset?.actionField ? `[data-action-field="${activeElement.dataset.actionField}"][data-action-key="${activeElement.dataset.actionKey}"]` : ""}${activeElement.dataset?.thresholdIndex ? `[data-threshold-index="${activeElement.dataset.thresholdIndex}"][data-threshold-key="${activeElement.dataset.thresholdKey}"]` : ""}`
        : null,
      selectionStart: typeof valueElement.selectionStart === "number" ? valueElement.selectionStart : null,
      selectionEnd: typeof valueElement.selectionEnd === "number" ? valueElement.selectionEnd : null,
    };
  }

  _restoreFocusState() {
    if (!this._focusState?.selector) return;

    requestAnimationFrame(() => {
      const target = this.querySelector(this._focusState.selector);
      if (!target) return;
      target.focus();

      const valueElement = target.inputElement || target;
      if (
        valueElement &&
        typeof valueElement.setSelectionRange === "function" &&
        this._focusState.selectionStart !== null &&
        this._focusState.selectionEnd !== null
      ) {
        valueElement.setSelectionRange(this._focusState.selectionStart, this._focusState.selectionEnd);
      }
    });
  }

  _emitConfigChanged(nextConfig, rerender = false) {
    this._captureFocusState(this._lastInteractedField);
    this._config = nextConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: nextConfig },
      })
    );

    if (rerender) {
      this._render();
    }
  }

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
      reverse_direction: false,
      button_color: "",
      name_content: "entity",
      show_power_secondary: true,
      show_on_off_label: true,
      power_thresholds: [],
      on_label: "SWITCH ON",
      off_label: "SWITCH OFF",
      unavailable_label: "UNAVAILABLE",
      state_text_on: "Active",
      state_text_off: "Idle",
      state_text_unavailable: "Not available",
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
    this._lastInteractedField = target;
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
    const previousValue = nextConfig[field];
    if (typeof value === "boolean") {
      nextConfig[field] = value;
    } else if (value) {
      nextConfig[field] = value;
    } else {
      delete nextConfig[field];
    }

    if (previousValue === nextConfig[field]) return;
    this._emitConfigChanged(nextConfig);
  }

  _actionChanged(event) {
    if (!this._config) return;
    const target = event.target;
    this._lastInteractedField = target;
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
    this._emitConfigChanged(nextConfig);
  }

  _thresholdChanged(index, key, value) {
    const thresholds = [...(this._config.power_thresholds || [])];
    const current = { ...(thresholds[index] || { above: "", color: "#ff0000" }) };
    current[key] = value;
    thresholds[index] = current;
    this._emitConfigChanged({ ...this._config, power_thresholds: thresholds }, true);
  }

  _addThreshold() {
    const thresholds = [...(this._config.power_thresholds || [])];
    thresholds.push({ above: "", color: "#ff0000" });
    this._emitConfigChanged({ ...this._config, power_thresholds: thresholds }, true);
  }

  _removeThreshold(index) {
    const thresholds = [...(this._config.power_thresholds || [])];
    thresholds.splice(index, 1);
    this._emitConfigChanged({ ...this._config, power_thresholds: thresholds }, true);
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

    const entityField = this._hass
      ? `
        <ha-entity-picker
          label="Switch entity"
          data-field="entity"
          value="${this._config.entity || ""}"
        ></ha-entity-picker>
      `
      : `
        <ha-textfield
          label="Switch entity"
          helper="Example: switch.tv"
          data-field="entity"
          value="${this._config.entity || ""}"
        ></ha-textfield>
      `;

    this.innerHTML = `
      <div class="card-config">
        ${entityField}
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
        <ha-textfield label="Unavailable label" data-field="unavailable_label" value="${this._config.unavailable_label || ""}"></ha-textfield>
        <ha-textfield label="State text when on" data-field="state_text_on" value="${this._config.state_text_on || ""}"></ha-textfield>
        <ha-textfield label="State text when off" data-field="state_text_off" value="${this._config.state_text_off || ""}"></ha-textfield>
        <ha-textfield label="State text when unavailable" data-field="state_text_unavailable" value="${this._config.state_text_unavailable || ""}"></ha-textfield>
        <ha-textfield label="Background start" data-field="background_start" value="${this._config.background_start || ""}"></ha-textfield>
        <ha-textfield label="Background end" data-field="background_end" value="${this._config.background_end || ""}"></ha-textfield>
        <ha-textfield label="Track color" data-field="track_color" value="${this._config.track_color || ""}"></ha-textfield>
        <ha-textfield label="Track inner color" data-field="track_inner_color" value="${this._config.track_inner_color || ""}"></ha-textfield>
        <ha-textfield label="Knob color" data-field="knob_color" value="${this._config.knob_color || ""}"></ha-textfield>
        <ha-textfield label="Chip active background" data-field="chip_active_background" value="${this._config.chip_active_background || ""}"></ha-textfield>
        <ha-textfield label="Chip inactive background" data-field="chip_inactive_background" value="${this._config.chip_inactive_background || ""}"></ha-textfield>
        <label class="toggle-field">
          <span>Compact square layout</span>
          <input type="checkbox" data-field="compact" ${this._config.compact ? "checked" : ""} />
        </label>
        <label class="toggle-field">
          <span>Show power below compact switch</span>
          <input
            type="checkbox"
            data-field="show_power_secondary"
            ${this._config.show_power_secondary ? "checked" : ""}
          />
        </label>
        <label class="toggle-field">
          <span>Show ON/OFF label</span>
          <input
            type="checkbox"
            data-field="show_on_off_label"
            ${this._config.show_on_off_label !== false ? "checked" : ""}
          />
        </label>
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
        <label class="toggle-field">
          <span>Reverse switch direction</span>
          <input
            type="checkbox"
            data-field="reverse_direction"
            ${this._config.reverse_direction ? "checked" : ""}
          />
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

        .toggle-field {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
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

    this.querySelectorAll("ha-textfield[data-action-field]").forEach((input) => {
      input.addEventListener("change", (event) => this._actionChanged(event));
      input.addEventListener("input", (event) => this._actionChanged(event));
    });

    this.querySelectorAll("select[data-action-field]").forEach((input) => {
      input.addEventListener("change", (event) => this._actionChanged(event));
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
      entityPicker.includeDomains = ["switch"];
      entityPicker.addEventListener("value-changed", (event) => this._valueChanged(event));
      entityPicker.addEventListener("change", (event) => this._valueChanged(event));
    }

    this.querySelectorAll('input[type="checkbox"][data-field]').forEach((input) => {
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

    this._restoreFocusState();
  }
}

class HeatSwitchCard extends ButtonSwitchCard {}
class HaButtonControllerCard extends ButtonSwitchCard {}

if (!customElements.get("button-switch-card")) {
  customElements.define("button-switch-card", ButtonSwitchCard);
}

if (!customElements.get("heat-switch-card")) {
  customElements.define("heat-switch-card", HeatSwitchCard);
}

if (!customElements.get("ha-button-controller")) {
  customElements.define("ha-button-controller", HaButtonControllerCard);
}

if (!customElements.get("button-switch-card-editor")) {
  customElements.define("button-switch-card-editor", ButtonSwitchCardEditor);
}

window.customCards = window.customCards || [];

const buttonSwitchPickerCards = [
  {
    type: "custom:button-switch-card",
    name: "Button Switch Card",
    description: "Switch on/off controller card with a visual editor and preview support.",
  },
  {
    type: "custom:heat-switch-card",
    name: "Heat Switch Card (alias)",
    description: "Compatibility alias for Button Switch Card.",
  },
  {
    type: "custom:ha-button-controller",
    name: "HA Button Controller (alias)",
    description: "Alias card type for the HA Button Controller with full UI editor support.",
  },
];

buttonSwitchPickerCards.forEach((cardDefinition) => {
  const alreadyRegistered = window.customCards.some((entry) => entry.type === cardDefinition.type);
  if (alreadyRegistered) return;

  window.customCards.push({
    ...cardDefinition,
    preview: true,
    documentationURL: "https://github.com/404GamerNotFound/ha-button-design",
  });
});
