import { BaseGame } from '../../core/BaseGame';
import { LANGUAGES, TranslationManager } from '../../core/TranslationManager';
import './NoButtonGame.css';

export class NoButtonGame extends BaseGame {
  private container: HTMLDivElement | null = null;
  private isDropdownOpen = false;
  private documentClickListener: ((e: MouseEvent) => void) | null = null;
  private voicesChangedListener: (() => void) | null = null;



  protected onInit(): void {
    this.canvas?.classList.add('hidden'); // We use DOM for this game

    this.container = document.createElement('div');
    this.container.id = 'no-button-game';
    this.container.innerHTML = `
      <div class="game-controls">
        <div class="custom-dropdown" id="language-dropdown-container">
          <button class="dropdown-trigger" id="dropdown-trigger-btn" aria-haspopup="listbox" aria-expanded="false">
            🌐 <span id="current-lang-name">Select Language</span>
          </button>
          <div class="dropdown-options" id="dropdown-options-list" role="listbox"></div>
        </div>
        <button id="random-lang-btn" class="control-btn">Random</button>
      </div>
      <div class="buttons-container">
        <div class="giant-button-wrapper" id="no-wrapper">
          <button id="giant-no-button" class="giant-button">NO</button>
        </div>
        <div class="giant-button-wrapper" id="yes-wrapper">
          <button id="giant-yes-button" class="giant-button">YES</button>
        </div>
      </div>
    `;

    document.getElementById('app')?.appendChild(this.container);

    const noBtn = this.container.querySelector('#giant-no-button');
    const yesBtn = this.container.querySelector('#giant-yes-button');
    const randomBtn = this.container.querySelector('#random-lang-btn');
    const triggerBtn = this.container.querySelector('#dropdown-trigger-btn');

    noBtn?.addEventListener('click', () => this.handleNo());
    yesBtn?.addEventListener('click', () => this.handleYes());

    triggerBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    randomBtn?.addEventListener('click', () => {
      // Pick randomly only from installed/supported languages
      const supportedLanguages = LANGUAGES.filter(l => this.audio.isLanguageSupported(l.code));
      const candidates = supportedLanguages.length > 0 ? supportedLanguages : [LANGUAGES[0]];
      const random = candidates[Math.floor(Math.random() * candidates.length)];
      
      TranslationManager.setLanguage(random.code);
      this.updateUI();
      // Preview by speaking the "Yes" translation in that language
      this.audio.speak(random.yes + '!', random.code);
    });

    // Close dropdown on outside click
    this.documentClickListener = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (this.isDropdownOpen && !this.container?.querySelector('#language-dropdown-container')?.contains(target)) {
        this.toggleDropdown(false);
      }
    };
    document.addEventListener('click', this.documentClickListener);

    // Initial load of language list
    this.renderLanguageList();
    this.updateUI();

    // Listen for Web Speech API voices loading asynchronously
    if ('speechSynthesis' in window) {
      this.voicesChangedListener = () => {
        this.renderLanguageList();
        this.updateUI();
      };
      window.speechSynthesis.addEventListener('voiceschanged', this.voicesChangedListener);
    }
  }

  private toggleDropdown(show?: boolean) {
    const dropdown = this.container?.querySelector('#dropdown-options-list');
    const trigger = this.container?.querySelector('#dropdown-trigger-btn');
    if (!dropdown || !trigger) return;

    this.isDropdownOpen = show ?? !this.isDropdownOpen;
    dropdown.classList.toggle('show', this.isDropdownOpen);
    trigger.setAttribute('aria-expanded', String(this.isDropdownOpen));
  }

  private renderLanguageList() {
    const list = this.container?.querySelector('#dropdown-options-list');
    if (!list) return;

    list.innerHTML = LANGUAGES.map(l => {
      const isSupported = this.audio.isLanguageSupported(l.code);
      const isSelected = l.code === TranslationManager.getCurrent().code;

      if (!isSupported) {
        // Detect OS for custom installation instructions
        const userAgent = navigator.userAgent;
        const isWindows = userAgent.includes('Windows');
        const isMac = userAgent.includes('Mac');
        const isAndroid = userAgent.includes('Android');
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);

        let instructions = 'Install this voice package in your device settings.';
        if (isWindows) {
          instructions = 'Settings -> Time & Language -> Speech -> Add voices.';
        } else if (isMac || isIOS) {
          instructions = 'Settings -> Accessibility -> Spoken Content -> Voices.';
        } else if (isAndroid) {
          instructions = 'Settings -> Languages & Input -> Text-to-speech output.';
        }

        return `
          <div class="dropdown-option-wrapper">
            <button class="dropdown-option disabled" disabled data-code="${l.code}">
              <span>${l.name}</span>
              <span class="badge">Not Installed</span>
            </button>
            <span class="tooltip">${instructions}</span>
          </div>
        `;
      }

      return `
        <div class="dropdown-option-wrapper">
          <button class="dropdown-option${isSelected ? ' active' : ''}" data-code="${l.code}">
            <span>${l.name}</span>
          </button>
        </div>
      `;
    }).join('');

    // Attach click events to enabled dropdown options
    list.querySelectorAll('.dropdown-option:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = (e.currentTarget as HTMLElement).dataset.code;
        if (code) {
          TranslationManager.setLanguage(code);
          this.updateUI();
          this.toggleDropdown(false);
        }
      });
    });
  }

  private updateUI() {
    const lang = TranslationManager.getCurrent();
    
    // Update Yes/No buttons text
    const yesBtn = this.container?.querySelector('#giant-yes-button');
    const noBtn = this.container?.querySelector('#giant-no-button');
    if (yesBtn) yesBtn.textContent = lang.yes.toUpperCase();
    if (noBtn) noBtn.textContent = lang.no.toUpperCase();

    // Update current selected language trigger button text
    const triggerSpan = this.container?.querySelector('#current-lang-name');
    if (triggerSpan) {
      triggerSpan.textContent = lang.name;
    }

    // Refresh option list active classes
    const list = this.container?.querySelector('#dropdown-options-list');
    if (list) {
      list.querySelectorAll('.dropdown-option:not(.disabled)').forEach(opt => {
        const code = (opt as HTMLElement).dataset.code;
        opt.classList.toggle('active', code === lang.code);
      });
    }
  }

  private handleNo() {
    const lang = TranslationManager.getCurrent();
    // Speak "No" in selected language via TTS
    this.audio.speak(lang.no + '.', lang.code);
    // Visual feedback shake animation
    this.triggerAnimation('no-wrapper', 'shake');
  }

  private handleYes() {
    const lang = TranslationManager.getCurrent();
    // Speak "Yes" in selected language via TTS
    this.audio.speak(lang.yes + '!', lang.code);
    // Visual feedback pulse/squash animation
    this.triggerAnimation('yes-wrapper', 'squash-stretch');
  }

  private triggerAnimation(wrapperId: string, className: string) {
    const wrapper = this.container?.querySelector(`#${wrapperId}`);
    if (wrapper) {
      wrapper.classList.remove(className);
      // Trigger reflow to restart CSS animation
      const _reflow = (wrapper as HTMLElement).offsetWidth;
      wrapper.classList.add(className);
    }
  }

  update(_dt: number): void {
    // No frame-by-frame updates needed for this DOM game
  }

  pause(): void {
    if (this.container) this.container.style.pointerEvents = 'none';
  }

  resume(): void {
    if (this.container) this.container.style.pointerEvents = 'all';
  }

  destroy(): void {
    if (this.documentClickListener) {
      document.removeEventListener('click', this.documentClickListener);
      this.documentClickListener = null;
    }
    if (this.voicesChangedListener) {
      window.speechSynthesis.removeEventListener('voiceschanged', this.voicesChangedListener);
      this.voicesChangedListener = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.canvas) {
      this.canvas.classList.remove('hidden');
    }
  }
}
