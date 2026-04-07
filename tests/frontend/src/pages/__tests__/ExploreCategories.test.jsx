import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ExploreCategories from '../ExploreCategories';

vi.mock('../../assets/categories/Electronics.jpg', () => ({ default: 'electronics.jpg' }));
vi.mock('../../assets/categories/Fashions.jpg', () => ({ default: 'fashions.jpg' }));
vi.mock('../../assets/categories/Collectibles.jpg', () => ({ default: 'collectibles.jpg' }));
vi.mock('../../assets/categories/Art.jpg', () => ({ default: 'art.jpg' }));
vi.mock('../../assets/categories/Furniture.jpg', () => ({ default: 'furniture.jpg' }));
vi.mock('../../assets/categories/Others.jpg', () => ({ default: 'others.jpg' }));

describe('ExploreCategories section', () => {
  function renderComponent(props = {}) {
    return render(
      <MemoryRouter>
        <ExploreCategories {...props} />
      </MemoryRouter>
    );
  }

  it('renders default category links with navigation targets', () => {
    renderComponent();

    expect(screen.getByText(/Explore by Category/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Electronics/i })).toHaveAttribute(
      'href',
      '/categories?category=electronics'
    );
    expect(screen.getByRole('link', { name: /Art/i })).toHaveAttribute(
      'href',
      '/categories?category=art'
    );
    // all tiles should be exposed as links so users can navigate
    expect(screen.getAllByRole('link')).toHaveLength(6);
  });

  it('falls back to placeholder image when category preview fails to load', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const testCategories = [
      { value: 'cars', label: 'Collector Cars', img: 'cars.png' },
    ];

    renderComponent({ categories: testCategories });

    const img = screen.getByAltText('Collector Cars');
    fireEvent.error(img);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('cars.png'));
    expect(img.src).toContain('data:image/svg+xml');
    warnSpy.mockRestore();
  });
});
