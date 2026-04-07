import React from 'react';
import { render, screen } from '@testing-library/react';
import About from '../About';

describe('About page', () => {
  it('renders all sections and content', () => {
    render(<About />);

    // Main heading
    expect(
      screen.getByRole('heading', { name: /About BidSphere/i })
    ).toBeInTheDocument();

    // Section headings
    expect(screen.getByRole('heading', { name: /What we do/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Our values/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Contact/i })).toBeInTheDocument();

    // Main description
    expect(screen.getByText(/BidSphere is an online auction platform/)).toBeInTheDocument();
    expect(screen.getByText(/connecting buyers and sellers/)).toBeInTheDocument();

    // What we do section
    expect(screen.getByText(/We provide listing tools, bidding/)).toBeInTheDocument();
    expect(screen.getByText(/payment and delivery coordination/)).toBeInTheDocument();

    // Our values section
    expect(screen.getByText(/Transparency — clear rules and fees/)).toBeInTheDocument();
    expect(screen.getByText(/Trust — secure payments and verified sellers/)).toBeInTheDocument();
    expect(screen.getByText(/Community — support collectors and small sellers/)).toBeInTheDocument();

    // Contact section links
    expect(screen.getByRole('link', { name: /Help Centre/i })).toHaveAttribute('href', '/help');
    expect(screen.getByRole('link', { name: /Feedback/i })).toHaveAttribute('href', '/feedback');
    expect(screen.getByText(/For support, please use the/)).toBeInTheDocument();
    expect(screen.getByText(/or submit feedback via our/)).toBeInTheDocument();

    // Check list structure
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
  });

  it('has proper semantic structure', () => {
    render(<About />);
    
    // Check main element
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('min-h-screen', 'bg-gray-50', 'py-12');

    // Check that all headings are properly structured
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(4); // h1 + 3 h2s
    expect(headings[0].tagName).toBe('H1');
    expect(headings[1].tagName).toBe('H2');
    expect(headings[2].tagName).toBe('H2');
    expect(headings[3].tagName).toBe('H2');
  });

  it('has accessible links', () => {
    render(<About />);
    
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    
    expect(links[0]).toHaveAttribute('href', '/help');
    expect(links[0]).toHaveTextContent('Help Centre');
    
    expect(links[1]).toHaveAttribute('href', '/feedback');
    expect(links[1]).toHaveTextContent('Feedback');
  });
});
