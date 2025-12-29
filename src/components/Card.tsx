import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  actions?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ children, title, className = '', actions, onClick, style }) => {
  return (
    <div className={`card ${className}`} onClick={onClick} style={style}>
      {(title || actions) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  );
};

export default Card;

