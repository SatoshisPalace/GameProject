import React from 'react';
import styled from 'styled-components';

interface ProfilePictureProps {
  imageUrl?: string;
}

const ProfileImageContainer = styled.div<{ imageUrl?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => props.imageUrl ? 'transparent' : '#2a2a2a'};
  border: 2px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
  
  &::after {
    content: '';
    display: ${props => props.imageUrl ? 'none' : 'block'};
    width: 24px;
    height: 24px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }
`;

const ProfileImage = styled.img`
  width: 130%;
  height: 130%;
  object-fit: cover;
  object-position: center;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  margin: 0;
  padding: 0;
  display: block;
`;

const ProfilePicture: React.FC<ProfilePictureProps> = ({ imageUrl }) => {
  return (
    <ProfileImageContainer imageUrl={imageUrl}>
      {imageUrl && <ProfileImage src={imageUrl} alt="Profile" />}
    </ProfileImageContainer>
  );
};

export default ProfilePicture;
