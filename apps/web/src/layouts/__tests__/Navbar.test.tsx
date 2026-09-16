import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../Navbar.js';
import { AuthContext } from '../../auth/AuthContext.js';
import { Role } from '@eliteship/shared';

afterEach(() => {
  cleanup();
});

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

const mockAuthValue = (role?: Role) => ({
  user: role ? {
    id: 'test-user-1',
    email: 'user@euroshub.com',
    fullName: 'Test Operator',
    role: role,
    isActive: true,
    hubStaffProfile: role === Role.HUB_STAFF ? { id: 'staff-1', hubId: 'hub-khi-1' } : null,
  } : null,
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
});

describe('Navbar Component & Route-Aware Highlighting', () => {
  it('renders Euroshub Logistics branding', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthContext.Provider value={mockAuthValue() as any}>
          <Navbar />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('Euroshub')).toBeDefined();
    expect(screen.getByText('Logistics')).toBeDefined();
  });

  it('does NOT contain dark mode toggle button', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthContext.Provider value={mockAuthValue() as any}>
          <Navbar />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.queryByLabelText(/toggle dark mode/i)).toBeNull();
  });

  it('accurately highlights Track Parcel when on /track and does NOT highlight other links', () => {
    render(
      <MemoryRouter initialEntries={['/track']}>
        <AuthContext.Provider value={mockAuthValue(Role.HUB_STAFF) as any}>
          <Navbar />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const trackLink = screen.getAllByRole('link', { name: /track parcel/i })[0];
    const bookLink = screen.getAllByRole('link', { name: /book shipment/i })[0];
    const hubLink = screen.getAllByRole('link', { name: /hub operations/i })[0];

    // Track link should have active styling (bg-brand-50, text-brand-700)
    expect(trackLink.className).toContain('bg-brand-50');
    expect(trackLink.className).toContain('text-brand-700');

    // Book Shipment and Hub Operations should NOT have active class
    expect(bookLink.className).not.toContain('bg-brand-50');
    expect(hubLink.className).not.toContain('bg-brand-50');
  });

  it('accurately highlights Hub Operations ONLY when on /hub/dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/hub/dashboard']}>
        <AuthContext.Provider value={mockAuthValue(Role.HUB_STAFF) as any}>
          <Navbar />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const hubLink = screen.getAllByRole('link', { name: /hub operations/i })[0];
    const trackLink = screen.getAllByRole('link', { name: /track parcel/i })[0];

    expect(hubLink.className).toContain('bg-brand-50');
    expect(hubLink.className).toContain('text-brand-700');
    expect(trackLink.className).not.toContain('bg-brand-50');
  });
});
