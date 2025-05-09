# Contributing to SocialOS

Thank you for your interest in contributing to SocialOS! This document provides guidelines and instructions to help make the contribution process smooth and effective.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

- Before submitting a bug report, please check existing issues to avoid duplicates
- Use the bug report template when creating a new issue
- Include detailed steps to reproduce the bug
- Specify your environment (OS, Node.js version, etc.)

### Suggesting Features

- Use the feature request template when creating a new issue
- Clearly describe the problem your feature would solve
- Suggest a solution if possible
- Consider how the feature integrates with existing functionality

### Pull Requests

1. Fork the repository
2. Create a branch for your feature or fix (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. Set up your development environment
   ```bash
   npm install
   ```
2. Make your changes
3. Run tests
   ```bash
   npm test
   ```
4. Make sure linting passes
   ```bash
   npm run lint
   ```

## Style Guides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### JavaScript Style Guide

We use ESLint and Prettier for consistent code style. Run `npm run lint` to check your code.

### Documentation Style Guide

- Use Markdown for documentation
- Follow the existing documentation structure
- Include code examples when applicable

## Additional Notes

### Agent Development Guidelines

When developing new agents:
- Ensure they follow the SocialOS agent protocol
- Include comprehensive documentation
- Provide example configurations
- Add appropriate tests

Thank you for contributing to SocialOS!
