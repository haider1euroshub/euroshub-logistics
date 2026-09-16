import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CreateShipmentPage } from '../CreateShipmentPage.js';
import { ToastProvider } from '../../components/ui/Toast.js';
import { AuthProvider } from '../../auth/AuthContext.js';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Mock apiClient to prevent real network calls during unit test
vi.mock('../../api/client.js', () => ({
  apiClient: vi.fn().mockResolvedValue({ estimation: { baseFee: 450, weightSurcharge: 0, totalFee: 450 } }),
  ApiError: class extends Error {},
}));

describe('CreateShipmentPage & ToastProvider Architecture', () => {
  it('throws error when rendered outside ToastProvider', () => {
    // Suppress console.error in this test as React logs the uncaught error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <CreateShipmentPage />
          </AuthProvider>
        </BrowserRouter>
      );
    }).toThrow('useToast must be used within ToastProvider');
    spy.mockRestore();
  });

  it('renders successfully within ToastProvider without crashing', () => {
    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <CreateShipmentPage />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify key elements render
    expect(screen.getByRole('heading', { level: 1, name: /Book Shipment/i })).toBeDefined();
    expect(screen.getByText('Sender Information')).toBeDefined();
    expect(screen.getByText('Recipient Information')).toBeDefined();
    expect(screen.getByText('Package Specifications')).toBeDefined();
    expect(screen.getByText('Service Level & Payment Terms')).toBeDefined();
    expect(screen.getByText('Confirm Booking & Generate Tracking')).toBeDefined();
  });
});
