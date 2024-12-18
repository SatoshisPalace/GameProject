import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
`;

export const LoadingShimmer = styled.div<{ height?: string }>`
  width: 100%;
  height: ${props => props.height || '20px'};
  margin: 10px 0;
  background: linear-gradient(to right, #1a1a1a 8%, #2a2a2a 18%, #1a1a1a 33%);
  background-size: 800px 104px;
  border-radius: 4px;
  animation: ${shimmer} 1.2s linear infinite forwards;
`;

export const LoadingSection = () => (
  <div>
    <LoadingShimmer height="20px" />
    <LoadingShimmer height="20px" />
    <LoadingShimmer height="20px" />
  </div>
);

export default LoadingSection;
