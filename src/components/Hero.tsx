import React from 'react';

export function Hero() {
  return (
    <div className="w-full relative">
      <div className="max-w-7xl mx-auto relative">
        <img
          src="/chama-no-espeto.jpeg"
          alt="Chama no Espeto"
          className="w-full h-auto max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] object-contain"
        />
      </div>
    </div>
  );
}
