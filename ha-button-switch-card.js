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
      icon: "mdi:radiator",
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

  render() {
    if (!this.shadowRoot || !this._config) return;

    const stateObj = this._hass ? this._hass.states[this._config.entity] : null;
    const isOn = this._isOn(stateObj);
    const friendlyName =
      this._config.name || stateObj?.attributes?.friendly_name || this._config.entity;

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card" role="button" tabindex="0" aria-label="Toggle ${friendlyName}">
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

          <div class="main-name">${friendlyName}</div>

          <div class="switch-wrap">
            <div class="track">
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
          background: linear-gradient(180deg, ${this._config.background_start}, ${this._config.background_end});
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

        .card:focus-visible {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
          border-radius: 20px;
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

          .state-text {
            font-size: 28px;
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
      icon: "mdi:radiator",
      ...config,
    };
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

    const value = target.value.trim();
    const nextConfig = { ...this._config };
    if (value) {
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

  _render() {
    if (!this._config) return;

    this.innerHTML = `
      <div class="card-config">
        <ha-textfield
          label="Switch entity"
          helper="Example: switch.tv"
          data-field="entity"
          value="${this._config.entity || ""}"
        ></ha-textfield>
        <ha-textfield
          label="Name"
          data-field="name"
          value="${this._config.name || ""}"
        ></ha-textfield>
        <ha-textfield
          label="Icon"
          helper="Example: mdi:radiator"
          data-field="icon"
          value="${this._config.icon || ""}"
        ></ha-textfield>
      </div>
      <style>
        .card-config {
          display: grid;
          gap: 12px;
        }
      </style>
    `;

    this.querySelectorAll("ha-textfield").forEach((input) => {
      input.addEventListener("change", (event) => this._valueChanged(event));
      input.addEventListener("input", (event) => this._valueChanged(event));
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
