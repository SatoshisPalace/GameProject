import { dryrun } from '../../../config/aoConnection';
import { BazarProfile } from '../types';
import { profileCache } from './profileCache';

export const checkBazarProfile = async (address: string, retryCount = 0): Promise<BazarProfile | null> => {
  try {
    // Check cache first
    const cachedProfile = profileCache.getProfile(address);
    if (cachedProfile) {
      console.log("=== Using cached Bazar profile ===");
      return cachedProfile;
    }

    console.log("=== Starting Bazar profile check ===", { retryCount });
    console.log("Looking for bazar profile for wallet:", address);
    const BAZAR_PROCESS = "SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY";
    
    const profileResult = await dryrun({
      process: BAZAR_PROCESS,
      data: JSON.stringify({
        Address: address
      }),
      tags: [
        { name: "Action", value: "Get-Profiles-By-Delegate" },
      ]
    });

    if (!profileResult?.Messages?.length && retryCount < 3) {
      console.log(`No content received, retrying in 1 second... (attempt ${retryCount + 1}/3)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return checkBazarProfile(address, retryCount + 1);
    }

    if (profileResult?.Messages?.[0]?.Data) {
      try {
        const profileData = JSON.parse(profileResult.Messages[0].Data);
        if (Array.isArray(profileData) && profileData.length > 0 && profileData[0].ProfileId) {
          const profileId = profileData[0].ProfileId;
          console.log("Found ProfileId:", profileId);

          const infoResult = await dryrun({
            process: profileId,
            data: JSON.stringify({
              ProfileId: profileId
            }),
            tags: [
              { name: "Action", value: "Info" },
            ]
          });

          if (infoResult?.Messages?.[0]?.Data) {
            const profileInfo = JSON.parse(infoResult.Messages[0].Data);
            const profile = profileInfo?.Profile;
            if (profile?.DisplayName) {
              console.log('Found Bazar Profile Display Name:', profile.DisplayName);
              // Cache the profile before returning
              profileCache.setProfile(address, profile);
              return profile;
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing profile data:', parseError);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error checking Bazar profile:", error);
    
    // Retry logic for network issues
    if (retryCount < 3) {
      console.log(`Retrying... (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return checkBazarProfile(address, retryCount + 1);
    }
    
    return null;
  }
};
