'use client';

import { PlayerWithAverages } from '@/types';
import Link from 'next/link';
import { useState } from 'react';

interface PlayerCardProps {
  player: PlayerWithAverages;
  teamName?: string;
}

export default function PlayerCard({ player, teamName }: PlayerCardProps) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Link href={`/players/${player.id}`}>
      <div style={{
        display: 'block',
        backgroundColor: '#fff',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e0e0e0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
        height: '100%'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}>
        {/* Player Image/Avatar */}
        <div style={{
          width: '100%',
          height: '180px',
          backgroundColor: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {!imageError && player.image ? (
            <img
              src={player.image}
              alt={player.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={() => setImageError(true)}
            />
          ) : (
            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#ff6b35',
              letterSpacing: '2px'
            }}>
              {getInitials(player.name)}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '16px' }}>
          {/* Name */}
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '16px',
            fontWeight: '700',
            color: '#1a1a2e',
            lineHeight: '1.3'
          }}>
            {player.name}
          </h3>

          {/* Number & Position */}
          <p style={{
            margin: '0 0 12px 0',
            color: '#ff6b35',
            fontSize: '13px',
            fontWeight: '600',
            letterSpacing: '0.5px'
          }}>
            #{player.number} • {player.position}
          </p>

          {/* Team */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid #f0f0f0'
          }}>
            <img
              src="/assets/logos/default.png"
              alt={teamName}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '4px',
                backgroundColor: '#f5f5f5'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span style={{
              fontSize: '13px',
              color: '#0066cc',
              fontWeight: '600',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {teamName || player.teamShortName}
            </span>
          </div>

          {/* Player Info Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            fontSize: '12px',
            marginBottom: '12px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: '#999', fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>Height</span>
              <p style={{
                margin: '4px 0 0 0',
                fontWeight: '700',
                color: '#1a1a2e',
                fontSize: '13px'
              }}>
                {player.height}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: '#999', fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>College</span>
              <p style={{
                margin: '4px 0 0 0',
                fontWeight: '700',
                color: '#1a1a2e',
                fontSize: '13px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {player.college || '-'}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: '#999', fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>Country</span>
              <p style={{
                margin: '4px 0 0 0',
                fontWeight: '700',
                color: '#1a1a2e',
                fontSize: '13px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {player.country || '-'}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          {player.averages && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              paddingTop: '12px',
              borderTop: '1px solid #f0f0f0'
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'block',
                  color: '#ff6b35'
                }}>
                  {player.averages.pointsPerGame}
                </span>
                <span style={{ fontSize: '10px', color: '#999', fontWeight: '600', textTransform: 'uppercase' }}>PPG</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'block',
                  color: '#ff6b35'
                }}>
                  {player.averages.reboundsPerGame}
                </span>
                <span style={{ fontSize: '10px', color: '#999', fontWeight: '600', textTransform: 'uppercase' }}>RPG</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'block',
                  color: '#ff6b35'
                }}>
                  {player.averages.assistsPerGame}
                </span>
                <span style={{ fontSize: '10px', color: '#999', fontWeight: '600', textTransform: 'uppercase' }}>APG</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
