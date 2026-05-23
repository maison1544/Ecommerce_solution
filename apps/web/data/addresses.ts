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

// ë°°í¬ìš© - ë¹ˆ ë°°ì—´ë¡œ ì‹œìž‘
export const addresses: Address[] = [];

export function getAddressesByUserId(userId: number): Address[] {
  const userAddresses = addresses.filter(addr => addr.userId === userId);
  // ê¸°ë³¸ ë°°ì†¡ì§€ë¥¼ ìµœìƒë‹¨ìœ¼ë¡œ ì •ë ¬
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

  // ìƒˆ ë°°ì†¡ì§€ë¥¼ ê¸°ë³¸ ë°°ì†¡ì§€ë¡œ ì„¤ì •í•˜ëŠ” ê²½ìš°, ê¸°ì¡´ ê¸°ë³¸ ë°°ì†¡ì§€ í•´ì œ
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

  // ê¸°ë³¸ ë°°ì†¡ì§€ë¡œ ì„¤ì •í•˜ëŠ” ê²½ìš°, ê°™ì€ ìœ ì €ì˜ ë‹¤ë¥¸ ë°°ì†¡ì§€ë“¤ ê¸°ë³¸ í•´ì œ
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

  // ê°™ì€ ìœ ì €ì˜ ëª¨ë“  ë°°ì†¡ì§€ ê¸°ë³¸ í•´ì œ
  addresses.forEach(addr => {
    if (addr.userId === address.userId) {
      addr.isDefault = addr.id === addressId;
    }
  });

  return true;
}
