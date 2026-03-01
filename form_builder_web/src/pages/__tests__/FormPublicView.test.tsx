import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FormPublicView from '../FormPublicView';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock Supabase with stable chaining using vi.hoisted
const { mockSingle, mockFrom } = vi.hoisted(() => {
    const single = vi.fn();
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select, insert: vi.fn(() => ({ error: null })) }));
    return { mockSingle: single, mockFrom: from };
});

vi.mock('../../supabaseClient', () => ({
    supabase: {
        from: mockFrom
    }
}));

const mockSchema = {
    id: 'test-form',
    title: 'Test Form',
    description: 'Test Description',
    branding: { coverColor: '#ffffff' },
    fields: [
        { id: '1', type: 'short_text', label: 'Field 1', required: true, fieldKey: 'f1' },
        { id: '2', type: 'email', label: 'Field 2', required: false, fieldKey: 'f2' },
    ],
    settings: {
        formType: 'standard',
        redirectMode: 'stay',
        successMessage: 'Done!',
    },
    theme: {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        accentColor: '#333333',
        buttonColor: '#333333',
        buttonTextColor: '#ffffff',
    },
    submitButton: { text: 'Submit', color: '#333333', fullWidth: true }
};

describe('FormPublicView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', () => {
        mockSingle.mockReturnValue(new Promise(() => { }));
        render(
            <MemoryRouter initialEntries={['/f/test-form']}>
                <Routes>
                    <Route path="/f/:formId" element={<FormPublicView />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it('renders standard mode correctly', async () => {
        mockSingle.mockResolvedValue({ data: mockSchema, error: null });

        render(
            <MemoryRouter initialEntries={['/f/test-form']}>
                <Routes>
                    <Route path="/f/:formId" element={<FormPublicView />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Field 1')).toBeInTheDocument();
            expect(screen.getByText('Field 2')).toBeInTheDocument();
        });
    });

    it('renders chat mode correctly and handles navigation', async () => {
        const chatSchema = {
            ...mockSchema,
            settings: { ...mockSchema.settings, formType: 'chat' }
        };
        mockSingle.mockResolvedValue({ data: chatSchema, error: null });

        render(
            <MemoryRouter initialEntries={['/f/test-form']}>
                <Routes>
                    <Route path="/f/:formId" element={<FormPublicView />} />
                </Routes>
            </MemoryRouter>
        );

        // Step 1: Should only show Field 1
        await waitFor(() => {
            expect(screen.getByText('Field 1')).toBeInTheDocument();
            expect(screen.queryByText('Field 2')).not.toBeInTheDocument();
        });

        // Try to go next without filling required field 1
        window.alert = vi.fn();
        fireEvent.click(screen.getByText(/Next/i));
        expect(window.alert).toHaveBeenCalled();

        // Fill Field 1 and go next
        const input1 = screen.getByPlaceholderText(/Your answer/i);
        fireEvent.change(input1, { target: { value: 'User 1' } });
        fireEvent.click(screen.getByText(/Next/i));

        // Step 2: Should only show Field 2
        await waitFor(() => {
            expect(screen.getByText('Field 2')).toBeInTheDocument();
            expect(screen.queryByText('Field 1')).not.toBeInTheDocument();
        });

        // Submit button should be visible on last step
        expect(screen.getByText(/Submit/i)).toBeInTheDocument();
    });
});
