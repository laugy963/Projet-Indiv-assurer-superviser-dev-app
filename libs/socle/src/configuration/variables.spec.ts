import { lireVariable } from './variables';

describe('lireVariable', () => {
  it('rend la valeur de la variable d’environnement', () => {
    expect(lireVariable('BDD_HOTE', { BDD_HOTE: 'postgres' })).toBe('postgres');
  });

  it('arrête le démarrage quand une variable obligatoire manque, en la nommant', () => {
    expect(() => lireVariable('BDD_MOT_DE_PASSE', {})).toThrow('BDD_MOT_DE_PASSE');
  });

  it('traite une variable vide comme absente', () => {
    expect(() => lireVariable('BDD_MOT_DE_PASSE', { BDD_MOT_DE_PASSE: '' })).toThrow('BDD_MOT_DE_PASSE');
  });

  it("n'écrit jamais la valeur d'une autre variable dans le message d'erreur", () => {
    let message = '';
    try {
      lireVariable('ABSENTE', { BDD_MOT_DE_PASSE: 'tres-secret' });
    } catch (erreur) {
      message = (erreur as Error).message;
    }
    expect(message).toContain('ABSENTE');
    expect(message).not.toContain('tres-secret');
  });
});
