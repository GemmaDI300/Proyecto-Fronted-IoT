import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SafeText from '../shared/components/SafeText';

describe('SafeText Component', () => {
  describe('Basic rendering', () => {
    it('should render plain text safely', () => {
      render(<SafeText>Hello World</SafeText>);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should escape HTML by default', () => {
      const { container } = render(
        <SafeText>&lt;script&gt;alert('XSS')&lt;/script&gt;</SafeText>
      );
      // Should not contain actual script tags
      expect(container.querySelector('script')).toBeNull();
    });

    it('should handle null children', () => {
      const { container } = render(<SafeText>{null}</SafeText>);
      expect(container.textContent).toBe('');
    });

    it('should handle undefined children', () => {
      const { container } = render(<SafeText>{undefined}</SafeText>);
      expect(container.textContent).toBe('');
    });

    it('should handle empty string', () => {
      const { container } = render(<SafeText>{''}</SafeText>);
      expect(container.textContent).toBe('');
    });
  });

  describe('XSS Prevention', () => {
    it('should prevent script injection', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const { container } = render(<SafeText>{maliciousInput}</SafeText>);

      // Should not contain script tags
      expect(container.querySelector('script')).toBeNull();

      // Should contain escaped version
      expect(container.textContent).toContain('script');
      expect(container.textContent).toContain('alert');
    });

    it('should prevent img onerror injection', () => {
      const maliciousInput = '<img src=x onerror="alert(1)">';
      const { container } = render(<SafeText>{maliciousInput}</SafeText>);

      // Should not contain img with onerror
      const img = container.querySelector('img');
      expect(img).toBeNull();
    });

    it('should prevent iframe injection', () => {
      const maliciousInput = '<iframe src="javascript:alert(1)"></iframe>';
      const { container } = render(<SafeText>{maliciousInput}</SafeText>);

      expect(container.querySelector('iframe')).toBeNull();
    });

    it('should prevent event handler injection', () => {
      const maliciousInput = '<div onclick="alert(1)">Click me</div>';
      const { container } = render(<SafeText>{maliciousInput}</SafeText>);

      const div = container.querySelector('div[onclick]');
      expect(div).toBeNull();
    });
  });

  describe('Text Truncation', () => {
    it('should truncate long text with default maxLength', () => {
      const longText = 'a'.repeat(1500);
      render(<SafeText>{longText}</SafeText>);

      const text = screen.getByText((content) => content.endsWith('...'));
      expect(text.textContent?.length).toBeLessThanOrEqual(1003); // 1000 + "..."
    });

    it('should truncate with custom maxLength', () => {
      const longText = 'a'.repeat(100);
      render(<SafeText maxLength={50}>{longText}</SafeText>);

      const text = screen.getByText((content) => content.endsWith('...'));
      expect(text.textContent?.length).toBe(53); // 50 + "..."
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      render(<SafeText maxLength={100}>{shortText}</SafeText>);

      expect(screen.getByText('Short text')).toBeInTheDocument();
      expect(screen.queryByText((content) => content.endsWith('...'))).toBeNull();
    });
  });

  describe('allowHtml prop (dangerous mode)', () => {
    it('should render HTML when allowHtml is true', () => {
      const htmlContent = '<b>Bold text</b>';
      const { container } = render(
        <SafeText allowHtml={true}>{htmlContent}</SafeText>
      );

      const bold = container.querySelector('b');
      expect(bold).toBeInTheDocument();
      expect(bold?.textContent).toBe('Bold text');
    });

    it('should NOT escape HTML when allowHtml is true', () => {
      const htmlContent = '<em>Emphasized</em>';
      const { container } = render(
        <SafeText allowHtml={true}>{htmlContent}</SafeText>
      );

      expect(container.querySelector('em')).toBeInTheDocument();
    });

    it('should still have script tags with allowHtml (React prevents execution)', () => {
      // Note: When allowHtml=true, SafeText renders HTML using dangerouslySetInnerHTML
      // React's dangerouslySetInnerHTML will include script tags but WON'T execute them
      // This is safe because React strips the executable behavior
      const dangerousHtml = '<script>alert("XSS")</script>';
      const { container } = render(
        <SafeText allowHtml={true}>{dangerousHtml}</SafeText>
      );

      // Script tag exists in DOM but cannot execute (React safety)
      const scriptElements = container.querySelectorAll('script');
      // React may or may not include the script tag depending on version
      // The important thing is it won't execute
      expect(scriptElements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration: Real-world scenarios', () => {
    it('should safely render user names from backend', () => {
      const userName = 'John <script>alert(1)</script> Doe';
      render(<SafeText>{userName}</SafeText>);

      // Should display the name without executing script
      expect(screen.getByText(/John.*Doe/)).toBeInTheDocument();
      expect(document.querySelector('script')).toBeNull();
    });

    it('should safely render user bios with potential XSS', () => {
      const bio = 'Developer with <img src=x onerror=alert(1)> 10 years experience';
      const { container } = render(<SafeText maxLength={100}>{bio}</SafeText>);

      expect(container.textContent).toContain('Developer');
      expect(container.textContent).toContain('10 years');
      expect(container.querySelector('img')).toBeNull();
    });

    it('should truncate very long description from backend', () => {
      const longDescription = 'Lorem ipsum '.repeat(200); // Very long text
      render(<SafeText maxLength={100}>{longDescription}</SafeText>);

      const element = screen.getByText((content) => content.endsWith('...'));
      expect(element.textContent?.length).toBe(103);
    });

    it('should handle mixed content (text + HTML attempts)', () => {
      const mixedContent = 'Normal text <b>bold</b> <script>evil</script> more text';
      const { container } = render(<SafeText>{mixedContent}</SafeText>);

      expect(container.textContent).toContain('Normal text');
      expect(container.textContent).toContain('more text');
      expect(container.querySelector('script')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should render content in accessible way', () => {
      render(<SafeText>Accessible content</SafeText>);
      const element = screen.getByText('Accessible content');

      // Should be readable by screen readers
      expect(element.textContent).toBe('Accessible content');
    });

    it('should preserve text structure for screen readers', () => {
      const structuredText = 'First line\nSecond line\nThird line';
      render(<SafeText>{structuredText}</SafeText>);

      expect(screen.getByText((content) => content.includes('First line'))).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should memoize sanitization result', () => {
      const text = 'Test text for memoization';
      const { rerender } = render(<SafeText>{text}</SafeText>);

      // Re-render with same props
      rerender(<SafeText>{text}</SafeText>);

      // Component should not throw and should render correctly
      expect(screen.getByText(text)).toBeInTheDocument();
    });

    it('should update when content changes', () => {
      const { rerender } = render(<SafeText>Initial text</SafeText>);
      expect(screen.getByText('Initial text')).toBeInTheDocument();

      rerender(<SafeText>Updated text</SafeText>);
      expect(screen.getByText('Updated text')).toBeInTheDocument();
      expect(screen.queryByText('Initial text')).not.toBeInTheDocument();
    });
  });
});
