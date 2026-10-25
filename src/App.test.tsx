import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

test('вершины «в поезде» не попадают в списки остановок', () => {
  render(<App />);
  expect(screen.getByText(/найти маршрут/i)).toBeInTheDocument();
  const values = screen.getAllByRole('option').map(o => (o as HTMLOptionElement).value);
  expect(values.some(v => v.includes('_train_'))).toBe(false);
});

test('поездка на метро показывается одним блоком до станции выхода', () => {
  render(<App />);
  fireEvent.click(screen.getByText(/другое время/i));
  fireEvent.click(screen.getByText(/найти маршрут/i));
  // Понедельник 8:00, общага → МИЭМ: едем по синей ветке до Строгино
  expect(screen.getByText('→ Метро Строгино')).toBeInTheDocument();
  expect(screen.getAllByText(/Метро \(синяя ветка\)/)).toHaveLength(1);
});
