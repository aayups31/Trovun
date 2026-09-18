import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Image from './ResilientImage';

vi.mock('next/image', () => ({
  default: ({ unoptimized, loader, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      data-direct={String(Boolean(unoptimized))}
      data-loader={String(Boolean(loader))}
      alt={String(props.alt)}
    />
  ),
}));

afterEach(cleanup);

describe('ResilientImage', () => {
  it('serves signed photos directly and falls back after a storage failure', () => {
    render(
      <Image
        src="https://example.supabase.co/storage/v1/object/sign/photos/desk.webp?token=test"
        alt="Desk"
        width={200}
        height={200}
      />,
    );
    expect(screen.getByRole('img')).toHaveAttribute('data-direct', 'true');
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Desk — photo unavailable');
    expect(screen.getByRole('img').getAttribute('src')).toMatch(/^data:image\/svg/);
  });

  it('retries a failed optimized image directly and resets when the source changes', () => {
    const { rerender } = render(<Image src="/photo.webp" alt="Photo" width={200} height={200} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img')).toHaveAttribute('src', '/photo.webp');
    expect(screen.getByRole('img')).toHaveAttribute('data-direct', 'true');
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Photo — photo unavailable');
    rerender(<Image src="/new.webp" alt="New photo" width={200} height={200} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/new.webp');
    expect(screen.getByRole('img')).toHaveAttribute('data-direct', 'false');
  });
});
