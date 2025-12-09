import { render, screen } from '@testing-library/react';
import App from './App';

test('renderiza a marca Datony no topo', () => {
  render(<App />);
  const heading = screen.getByText(/Datony/i);
  expect(heading).toBeInTheDocument();
});
