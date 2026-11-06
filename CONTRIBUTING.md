# Contributing to IMEI Tracker & Recovery Hub

Thank you for investing your time in improving **IMEI Tracker & Recovery Hub**!

This document provides a set of guidelines and best practices for contributing to this open-source project.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior following the guidelines in that document.

---

## How Can I Contribute?

### Reporting Bugs
Before creating bug reports, please check the existing [Issues](https://github.com/Akhil-Binu/imei-tracker-recovery/issues) list. If you find a new bug, please open an issue using the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) including:
- Clear and descriptive title
- Steps to reproduce
- Expected vs. actual behavior
- Device, OS, and browser environment specs
- Any relevant console logs or screenshots

### Suggesting Enhancements
Feature requests are tracked in GitHub Issues. Please use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) and describe:
- The problem your enhancement addresses
- The proposed solution and alternative solutions considered
- Context on how it benefits end users

### Code Contributions
1. Fork the repo and clone it locally.
2. Create a new topic branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Test your changes locally across modern browsers (Chrome, Firefox, Safari/iOS, Edge).
4. Verify that formatting is clean, with no broken console statements or syntax warnings.
5. Commit using the [Conventional Commits](https://www.conventionalcommits.org/) convention:
   - `feat: add export to GeoJSON for GPS trails`
   - `fix: resolve Luhn check rounding issue on 14-digit inputs`
   - `docs: update setup instructions in README`
   - `style: refine HUD contrast in light theme`
6. Push to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
7. Submit a Pull Request targeting `main`.

---

## Coding Standards

- **Vanilla Web Technologies**: Maintain zero-runtime-dependency simplicity. Avoid introducing heavy framework dependencies unless explicitly discussed in an architectural issue.
- **Modern ES6+**: Use `const`/`let`, arrow functions, async/await, and semantic DOM query APIs.
- **CSS Architecture**: Maintain CSS variable hierarchies (`var(--accent)`, `var(--bg-card)`) in `style.css` ensuring seamless Dark and Light theme support.
- **Data Integrity**: When updating `tac_full.csv`, ensure TAC codes are strictly 8-digit numeric entries.

---

## Pull Request Checklist

Before submitting your PR, ensure:
- [ ] Code follows the existing formatting and conventions.
- [ ] Changes have been tested in both Light and Dark modes.
- [ ] No extraneous build files, logs, or secrets are committed.
- [ ] The PR description outlines what was changed, why, and includes screenshots if UI elements were modified.
