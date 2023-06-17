import { Modal } from "../modules/modal.js";
import { toggleLoader, _post } from "../modules/common.js";

export class Login {
    private _modal: Modal;
    private _form: HTMLFormElement;
    private _url: string;
    private _onLogin: (username: string, password: string) => void;
    private _logoutButton: HTMLElement = null;

    constructor(modal: Modal, endpoint: string) {

        this._url = window.URLBase + endpoint;
        if (this._url[this._url.length-1] != '/') this._url += "/";

        this._modal = modal;
        this._form = this._modal.asElement().querySelector(".form-login") as HTMLFormElement;
        this._form.onsubmit = (event: SubmitEvent) => {
            event.preventDefault();
            const button = (event.target as HTMLElement).querySelector(".submit") as HTMLSpanElement;
            const username = (document.getElementById("login-user") as HTMLInputElement).value;
            const password = (document.getElementById("login-password") as HTMLInputElement).value;
            if (!username || !password) {
                window.notifications.customError("loginError", window.lang.notif("errorLoginBlank"));
                return;
            }
            toggleLoader(button);
            this.login(username, password, () => toggleLoader(button));
        };
    }

    bindLogout = (button: HTMLElement) => {
        this._logoutButton = button;
        this._logoutButton.classList.add("unfocused");
        this._logoutButton.onclick = () => _post(this._url + "logout", null, (req: XMLHttpRequest): boolean => {
            if (req.readyState == 4 && req.status == 200) {
                window.token = "";
                location.reload();
                return false;
            }
        });
    };

    get onLogin() { return this._onLogin; }
    set onLogin(f: (username: string, password: string) => void) { this._onLogin = f; }

    login = (username: string, password: string, run?: (state?: number) => void) => {
        const req = new XMLHttpRequest();
        req.responseType = 'json';
        const refresh = (username == "" && password == "");
        req.open("GET", this._url + (refresh ? "token/refresh" : "token/login"), true);
        if (!refresh) {
            req.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + password));
        }
        req.onreadystatechange = ((req: XMLHttpRequest, _: Event): any => {
            if (req.readyState == 4) {
                if (req.status != 200) {
                    let errorMsg = window.lang.notif("errorConnection");
                    if (req.response) {
                        errorMsg = req.response["error"];
                        const langErrorMsg = window.lang.strings(errorMsg);
                        if (langErrorMsg) {
                            errorMsg = langErrorMsg;
                        }
                    }
                    if (!errorMsg) {
                        errorMsg = window.lang.notif("errorUnknown");
                    }
                    if (!refresh) {
                        window.notifications.customError("loginError", errorMsg);
                    } else {
                        this._modal.show();
                    }
                } else {
                    const data = req.response;
                    window.token = data["token"];
                    if (this._onLogin) {
                        this._onLogin(username, password);
                    }
                    this._modal.close();
                    if (this._logoutButton != null)
                        this._logoutButton.classList.remove("unfocused");
                }
                if (run) { run(+req.status); }
            }
        }).bind(this, req);
        req.send();
    };
}

