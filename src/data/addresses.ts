export interface Address {
  id: number;
  userId: number;
  name: string;
  recipient: string;
  phone: string;
  address: string;
  detailAddress: string;
  postalCode: string;
  isDefault: boolean;
}

// 배포용 - 빈 배열로 시작
export const addresses: Address[] = [];

export function getAddressesByUserId(userId: number): Address[] {
  const userAddresses = addresses.filter(addr => addr.userId === userId);
  // 기본 배송지를 최상단으로 정렬
  return userAddresses.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return 0;
  });
}

export function getDefaultAddress(userId: number): Address | undefined {
  return addresses.find(addr => addr.userId === userId && addr.isDefault);
}

export function addAddress(userId: number, addressData: Omit<Address, "id" | "userId">): Address {
  const newAddress: Address = {
    ...addressData,
    id: Math.max(...addresses.map(a => a.id), 0) + 1,
    userId
  };
  
  // 새 배송지를 기본 배송지로 설정하는 경우, 기존 기본 배송지 해제
  if (newAddress.isDefault) {
    addresses.forEach(addr => {
      if (addr.userId === userId) {
        addr.isDefault = false;
      }
    });
  }
  
  addresses.push(newAddress);
  return newAddress;
}

export function updateAddress(addressId: number, addressData: Partial<Omit<Address, "id" | "userId">>): boolean {
  const index = addresses.findIndex(a => a.id === addressId);
  if (index === -1) return false;
  
  const address = addresses[index];
  
  // 기본 배송지로 설정하는 경우, 같은 유저의 다른 배송지들 기본 해제
  if (addressData.isDefault) {
    addresses.forEach(addr => {
      if (addr.userId === address.userId && addr.id !== addressId) {
        addr.isDefault = false;
      }
    });
  }
  
  addresses[index] = { ...address, ...addressData };
  return true;
}

export function deleteAddress(addressId: number): boolean {
  const index = addresses.findIndex(a => a.id === addressId);
  if (index !== -1) {
    addresses.splice(index, 1);
    return true;
  }
  return false;
}

export function setDefaultAddress(addressId: number): boolean {
  const address = addresses.find(a => a.id === addressId);
  if (!address) return false;
  
  // 같은 유저의 모든 배송지 기본 해제
  addresses.forEach(addr => {
    if (addr.userId === address.userId) {
      addr.isDefault = addr.id === addressId;
    }
  });
  
  return true;
}
