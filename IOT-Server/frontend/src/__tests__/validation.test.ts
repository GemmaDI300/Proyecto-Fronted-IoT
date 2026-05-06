import { describe, it, expect } from 'vitest';
import {
  validatePasswordStrength,
  validateCURP,
  validateRFC,
} from '../shared/api/schemas/validation';

describe('Validation Functions', () => {
  describe('validatePasswordStrength', () => {
    it('should accept strong passwords', () => {
      expect(validatePasswordStrength('MyP@ssw0rd!')).toBe(true);
      expect(validatePasswordStrength('S3cur3#Pass')).toBe(true);
      expect(validatePasswordStrength('Admin2026!')).toBe(true);
      expect(validatePasswordStrength('C0mpl3x&P@ss')).toBe(true);
    });

    it('should reject passwords without uppercase', () => {
      expect(validatePasswordStrength('myp@ssw0rd!')).toBe(false);
    });

    it('should reject passwords without lowercase', () => {
      expect(validatePasswordStrength('MYP@SSW0RD!')).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      expect(validatePasswordStrength('MyP@ssword!')).toBe(false);
    });

    it('should reject passwords without special characters', () => {
      expect(validatePasswordStrength('MyPassword1')).toBe(false);
    });

    it('should reject passwords shorter than 8 characters', () => {
      expect(validatePasswordStrength('P@ss1')).toBe(false);
      expect(validatePasswordStrength('Ab1!')).toBe(false);
    });

    it('should reject common weak passwords', () => {
      expect(validatePasswordStrength('password')).toBe(false);
      expect(validatePasswordStrength('12345678')).toBe(false);
      expect(validatePasswordStrength('qwerty')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validatePasswordStrength('')).toBe(false);
      expect(validatePasswordStrength('P@ssw0rd')).toBe(true); // Exactly 8 chars
    });

    // OWASP compliance tests
    it('should meet OWASP password requirements', () => {
      const owasp_passwords = [
        'Tr0ub4dor&3', // Has upper, lower, number, special
        'MyS3cur3P@ssw0rd', // Clear OWASP compliance
      ];
      owasp_passwords.forEach((pwd) => {
        expect(validatePasswordStrength(pwd)).toBe(true);
      });
    });
  });

  describe('validateCURP', () => {
    it('should accept valid CURPs', () => {
      expect(validateCURP('OEAF771012HMCRRL09')).toBe(true); // Hombre
      expect(validateCURP('MATR850428MDFRDY08')).toBe(true); // Mujer
      expect(validateCURP('LOPC920315HDFLPD02')).toBe(true);
      expect(validateCURP('GACJ850101HDFRRN08')).toBe(true);
    });

    it('should reject CURPs with wrong length', () => {
      expect(validateCURP('OEAF771012HMCRRL0')).toBe(false); // 17 chars
      expect(validateCURP('OEAF771012HMCRRL099')).toBe(false); // 19 chars
    });

    it('should reject CURPs with invalid format', () => {
      expect(validateCURP('1234567890HMCRRL09')).toBe(false); // Starts with numbers
      expect(validateCURP('OEAF77ABCDHMCRRL09')).toBe(false); // Letters in date
      expect(validateCURP('OEAF771012XMCRRL09')).toBe(false); // Invalid sex (X)
    });

    it('should reject CURPs with invalid sex character', () => {
      expect(validateCURP('OEAF771012XMCRRL09')).toBe(false); // X not allowed
      expect(validateCURP('OEAF771012FMCRRL09')).toBe(false); // F not allowed
      expect(validateCURP('OEAF771012PMCRRL09')).toBe(false); // P not allowed
    });

    it('should be case-sensitive (uppercase only)', () => {
      expect(validateCURP('oeaf771012hmcrrl09')).toBe(false); // lowercase
      expect(validateCURP('Oeaf771012Hmcrrl09')).toBe(false); // mixed case
    });

    it('should reject sequences that don\'t match CURP structure', () => {
      // These should fail because they don't match the exact CURP pattern
      expect(validateCURP('111111111111111111')).toBe(false); // All numbers
      expect(validateCURP('AAAAAAAAAAAAAAAA11')).toBe(false); // Missing numbers in date position
      expect(validateCURP('ABC1234567HDFXYZ99')).toBe(false); // Only 3 letters at start
    });

    it('should handle empty and special cases', () => {
      expect(validateCURP('')).toBe(false);
      expect(validateCURP('   ')).toBe(false);
    });

    // Real-world CURP examples
    it('should validate real CURP patterns', () => {
      const validCURPs = [
        'BEJA850215HDFLRN01', // Real structure: 4L+6N+H+5L+2N
        'AACJ840203MDFRRN09',
        'PEAF901012HMCRRS03',
      ];
      validCURPs.forEach((curp) => {
        expect(validateCURP(curp)).toBe(true);
      });
    });
  });

  describe('validateRFC', () => {
    it('should accept valid RFC for physical persons (13 chars)', () => {
      expect(validateRFC('OEAF771012A19')).toBe(true);
      expect(validateRFC('MATR850428AB3')).toBe(true);
      expect(validateRFC('LOPC920315ZX1')).toBe(true);
    });

    it('should accept valid RFC for legal entities (12 chars)', () => {
      expect(validateRFC('GOM9806031R0')).toBe(true);
      expect(validateRFC('TES010101XY9')).toBe(true);
      expect(validateRFC('ABC850101123')).toBe(true);
    });

    it('should reject RFCs with wrong length', () => {
      expect(validateRFC('OEAF771012A1')).toBe(false); // 12 chars (should be 13 for person)
      expect(validateRFC('OEAF771012A199')).toBe(false); // 14 chars
      expect(validateRFC('GOM980603')).toBe(false); // Too short
    });

    it('should reject RFCs with invalid format', () => {
      expect(validateRFC('123456789012')).toBe(false); // All numbers
      expect(validateRFC('ABCDEFGHIJKL')).toBe(false); // All letters (no date)
      expect(validateRFC('OEAF77ABCDABC')).toBe(false); // Letters in date position
    });

    it('should handle homoclave validation', () => {
      expect(validateRFC('OEAF771012A19')).toBe(true); // Valid homoclave
      expect(validateRFC('OEAF771012119')).toBe(true); // Numeric homoclave
      expect(validateRFC('OEAF771012AB9')).toBe(true); // Mixed homoclave
    });

    it('should be case-sensitive (uppercase only)', () => {
      expect(validateRFC('oeaf771012a19')).toBe(false); // lowercase
      expect(validateRFC('Oeaf771012A19')).toBe(false); // mixed case
    });

    it('should reject invalid RFC patterns', () => {
      expect(validateRFC('AB1234567890')).toBe(false); // 2 letters (needs 3 or 4)
      expect(validateRFC('ABCDE123456789')).toBe(false); // 5 letters (too many)
      expect(validateRFC('ABC12345678')).toBe(false); // Wrong total length (11 chars)
    });

    it('should handle edge cases', () => {
      expect(validateRFC('')).toBe(false);
      expect(validateRFC('   ')).toBe(false);
    });

    // Real-world RFC examples
    it('should validate real RFC patterns', () => {
      const validRFCs = [
        'BEJA850215HD1', // Physical person - 13 chars
        'AACJ840203AB2', // Physical person - 13 chars
        'PEAF901012RS3', // Physical person - 13 chars
        'GOM980603XY0', // Legal entity - 12 chars
        'TES010101AB9', // Legal entity - 12 chars
      ];
      validRFCs.forEach((rfc) => {
        expect(validateRFC(rfc)).toBe(true);
      });
    });
  });

  // Integration tests for validation chain
  describe('Integration: Validation workflow', () => {
    it('should validate complete user profile data', () => {
      const userData = {
        password: 'MyP@ssw0rd123',
        curp: 'OEAF771012HMCRRL09',
        rfc: 'OEAF771012A19',
      };

      expect(validatePasswordStrength(userData.password)).toBe(true);
      expect(validateCURP(userData.curp)).toBe(true);
      expect(validateRFC(userData.rfc)).toBe(true);
    });

    it('should reject invalid user profile data', () => {
      const invalidData = {
        password: 'weak',
        curp: 'INVALID',
        rfc: '123',
      };

      expect(validatePasswordStrength(invalidData.password)).toBe(false);
      expect(validateCURP(invalidData.curp)).toBe(false);
      expect(validateRFC(invalidData.rfc)).toBe(false);
    });

    it('should handle CURP/RFC mismatch scenarios', () => {
      // CURP: OEAF771012HMCRRL09
      // RFC should start with: OEAF771012
      const curp = 'OEAF771012HMCRRL09';
      const matchingRFC = 'OEAF771012A19';
      const mismatchRFC = 'MATR850428AB3';

      expect(validateCURP(curp)).toBe(true);
      expect(validateRFC(matchingRFC)).toBe(true);
      expect(validateRFC(mismatchRFC)).toBe(true); // Both valid, just different people

      // In real app, you'd verify they match the same person
      expect(matchingRFC.startsWith(curp.substring(0, 10))).toBe(true);
      expect(mismatchRFC.startsWith(curp.substring(0, 10))).toBe(false);
    });
  });

  // Performance tests
  describe('Performance: Validation speed', () => {
    it('should validate passwords quickly (< 1ms per validation)', () => {
      const start = performance.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        validatePasswordStrength('MyP@ssw0rd123');
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(1); // Less than 1ms per validation
    });

    it('should validate CURPs quickly', () => {
      const start = performance.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        validateCURP('OEAF771012HMCRRL09');
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(1);
    });

    it('should validate RFCs quickly', () => {
      const start = performance.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        validateRFC('OEAF771012A19');
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(1);
    });
  });
});
