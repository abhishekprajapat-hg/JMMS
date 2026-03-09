import { useEffect, useState } from 'react'
import { apiRequest, formatCurrency } from '../api'
import { usePortal } from '../context/usePortal'

function getInitialState() {
  return {
    mandirProfile: {},
    donationSnapshot: { totalAmount: 0, donationCount: 0, supporterFamilies: 0 },
  }
}

export function AboutMandirPage() {
  const { mandirs, showNotice } = usePortal()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(getInitialState)

  const selectedMandir = mandirs[0] || null

  useEffect(() => {
    let isMounted = true

    async function load() {
      setLoading(true)
      try {
        const response = await apiRequest('/public/home')
        if (isMounted) {
          setData(response)
        }
      } catch (error) {
        showNotice('error', error.message)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [showNotice])

  return (
    <section className="panel ring-1 ring-amber-100/60">
      <div className="panel-head space-y-1">
        <h2>About Mandir</h2>
        <p>Mandir profile and public contribution highlights.</p>
      </div>

      <div className="about-grid items-start">
        <article className="backdrop-blur-sm">
          <h3>{data.mandirProfile?.name || selectedMandir?.name || '-'}</h3>
          <p>{data.mandirProfile?.address || selectedMandir?.address || '-'}</p>
          <p>PAN: {data.mandirProfile?.pan || '-'}</p>
          <p>80G: {data.mandirProfile?.reg80G || '-'}</p>
          <p>Trust No: {data.mandirProfile?.trustNumber || '-'}</p>
        </article>

        <article className="backdrop-blur-sm">
          <h3>Contribution Snapshot</h3>
          {loading ? (
            <p>Loading profile data...</p>
          ) : (
            <>
              <p>Total Donations: <strong>{formatCurrency(data.donationSnapshot?.totalAmount || 0)}</strong></p>
              <p>Donation Count: <strong>{data.donationSnapshot?.donationCount || 0}</strong></p>
              <p>Supporter Families: <strong>{data.donationSnapshot?.supporterFamilies || 0}</strong></p>
            </>
          )}
        </article>
      </div>
    </section>
  )
}
