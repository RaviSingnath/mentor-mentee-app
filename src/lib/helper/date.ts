export const getExpiresAtDate = () => {
  return new Date(Date.now() + 3600 * 1000).toISOString();
};

export const currentDate = () => {
  return new Date(Date.now()).toISOString();
};

export const dayBeforeDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);

  return date.toISOString();
};

export const dayAfterDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  return date.toISOString();
};
