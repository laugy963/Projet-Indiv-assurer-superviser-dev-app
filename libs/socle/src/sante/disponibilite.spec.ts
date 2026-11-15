import { Disponibilite } from './disponibilite';

// Sonde « prêt » : le service ne reçoit du trafic que si ses dépendances répondent.
describe('Disponibilite — le service peut-il servir ?', () => {
  it('sans dépendance à vérifier, le service est prêt', async () => {
    await expect(new Disponibilite([]).verifier()).resolves.toBeUndefined();
  });

  it('prêt quand chaque dépendance répond', async () => {
    const base = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

    await expect(new Disponibilite([base]).verifier()).resolves.toBeUndefined();

    expect(base).toHaveBeenCalledTimes(1);
  });

  it('pas prêt dès qu’une dépendance échoue', async () => {
    const base = jest.fn().mockResolvedValue(1);
    const autre = jest.fn().mockRejectedValue(new Error('connexion refusée'));

    await expect(new Disponibilite([base, autre]).verifier()).rejects.toThrow('connexion refusée');
  });

  it('pas prêt quand une dépendance ne répond pas dans le délai : la sonde ne reste pas en attente', async () => {
    const muette = () => new Promise<never>(() => undefined);
    const depart = Date.now();

    await expect(new Disponibilite([muette], 30).verifier()).rejects.toThrow('Délai dépassé');

    expect(Date.now() - depart).toBeLessThan(1000);
  });

  it('une réponse arrivée à temps n’est pas suivie d’un délai dépassé', async () => {
    const lente = () => new Promise((suite) => setTimeout(suite, 10));

    await expect(new Disponibilite([lente], 500).verifier()).resolves.toBeUndefined();
  });
});
