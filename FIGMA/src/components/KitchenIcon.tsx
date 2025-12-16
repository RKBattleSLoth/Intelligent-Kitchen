import peachIcon from 'figma:asset/61cba26a0e4c95e6ba3b2a2b18203902637b9ebe.png';

export function KitchenIcon() {
  return (
    <div 
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        width: '45px',
        height: '45px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}
    >
      {/* Peach icon */}
      <img 
        src={peachIcon} 
        alt="Peach" 
        className="w-full h-full"
        style={{
          objectFit: 'cover',
          objectPosition: 'center center',
          display: 'block'
        }}
      />
    </div>
  );
}